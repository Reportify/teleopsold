from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import Project, ProjectDesign, ProjectDesignVersion, DesignItem, ProjectSite
from apps.sites.models import Site
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectCreateSerializer,
    ProjectUpdateSerializer, ProjectStatsSerializer,
    ProjectDesignVersionSerializer, CreateDesignVersionRequestSerializer, CreateDesignItemRequestSerializer,
    DesignItemSerializer, ProjectSiteSerializer, LinkSitesRequestSerializer, ImportProjectSitesUploadSerializer,
)
from core.permissions.tenant_permissions import TenantScopedPermission
from core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for managing projects with comprehensive functionality"""
    permission_classes = [IsAuthenticated, TenantScopedPermission]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'project_type', 'circle']
    search_fields = ['name', 'description', 'activity']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter projects by tenant and exclude soft-deleted records"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Project.objects.none()

        return (
            Project.objects
            .filter(tenant=tenant, deleted_at__isnull=True)
            .annotate(site_count=models.Count('project_sites', filter=models.Q(project_sites__is_active=True)))
            .select_related('client_tenant', 'created_by')
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ProjectCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProjectUpdateSerializer
        elif self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        """Create project with tenant context"""
        tenant = getattr(self.request, 'tenant', None)
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )

    def destroy(self, request, *args, **kwargs):
        """Soft delete: set deleted_at, do not hard delete"""
        project = self.get_object()
        if project.deleted_at:
            return Response(status=status.HTTP_204_NO_CONTENT)
        project.deleted_at = timezone.now()
        project.save(update_fields=['deleted_at', 'updated_at'])
        logger.info(f"Project {project.name} soft-deleted by {request.user.email}")
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Team member endpoints removed for Phase 1

    # --- Workflow endpoints (explicit) ---
    def _set_status(self, project: Project, new_status: str):
        """Internal helper to validate and set status according to Phase 1 transitions"""
        valid_transitions = {
            'planning': {'active', 'cancelled'},
            'active': {'on_hold', 'completed', 'cancelled'},
            'on_hold': {'active', 'cancelled'},
            'completed': set(),
            'cancelled': set(),
        }

        if new_status not in dict(Project.PROJECT_STATUS):
            return False, 'Invalid status'

        current = project.status
        if new_status not in valid_transitions.get(current, set()):
            return False, f'Cannot transition from {current} to {new_status}'

        project.status = new_status
        project.save(update_fields=['status', 'updated_at'])
        return True, None

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update project status"""
        project = self.get_object()
        new_status = request.data.get('status')
        ok, err = self._set_status(project, new_status)
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} status updated to {new_status} by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'active')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} activated by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def hold(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'on_hold')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} put on hold by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'completed')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} completed by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'cancelled')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} cancelled by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get project statistics for the tenant"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        projects = Project.objects.filter(tenant=tenant, deleted_at__isnull=True)
        
        # Calculate statistics
        total_projects = projects.count()
        active_projects = projects.filter(status='active').count()
        completed_projects = projects.filter(status='completed').count()
        planning_projects = projects.filter(status='planning').count()
        on_hold_projects = projects.filter(status='on_hold').count()
        cancelled_projects = projects.filter(status='cancelled').count()
        
        # Project type breakdown
        project_types = projects.values('project_type').annotate(count=models.Count('id')).order_by('project_type')
        
        # Recent projects
        recent_projects = projects.order_by('-created_at')[:5]
        
        stats_data = {
            'total_projects': total_projects,
            'active_projects': active_projects,
            'completed_projects': completed_projects,
            'planning_projects': planning_projects,
            'on_hold_projects': on_hold_projects,
            'cancelled_projects': cancelled_projects,
            'project_types': list(project_types),
            'recent_projects': ProjectSerializer(recent_projects, many=True).data,
            'completion_rate': (completed_projects / total_projects * 100) if total_projects > 0 else 0
        }
        
        return Response(stats_data)

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update project status"""
        project_ids = request.data.get('project_ids', [])
        new_status = request.data.get('status')
        
        if not project_ids:
            return Response(
                {'error': 'project_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(Project.PROJECT_STATUS):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = getattr(request, 'tenant', None)
        updated_count = Project.objects.filter(
            id__in=project_ids,
            tenant=tenant,
            deleted_at__isnull=True
        ).update(status=new_status, updated_at=timezone.now())
        
        logger.info(f"Bulk updated {updated_count} projects to status {new_status} by {request.user.email}")
        
        return Response({
            'message': f'Updated {updated_count} projects',
            'updated_count': updated_count
        })

    # -----------------------------
    # Phase 2 - Project Design Endpoints (Draft/Publish)
    # -----------------------------

    def _get_or_create_design(self, project: Project) -> ProjectDesign:
        tenant = getattr(self.request, 'tenant', None)
        design, _created = ProjectDesign.objects.get_or_create(
            tenant=tenant,
            project=project,
            defaults={'created_by': self.request.user}
        )
        return design

    @action(detail=True, methods=['get', 'post'], url_path='design/versions')
    def design_versions(self, request, pk=None):
        project = self.get_object()
        design = self._get_or_create_design(project)

        if request.method.lower() == 'get':
            versions = design.versions.all().order_by('-version_number')
            return Response(ProjectDesignVersionSerializer(versions, many=True).data)

        # POST - create draft version (optionally copy from existing)
        serializer = CreateDesignVersionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Enforce single draft per design: return existing draft if present
        existing_draft = design.versions.filter(status='draft').first()
        if existing_draft:
            return Response(ProjectDesignVersionSerializer(existing_draft).data)

        # Compute next version_number based on latest published if any, else 1 for first draft
        latest_published = design.versions.filter(status='published').order_by('-version_number').first()
        next_version_number = (latest_published.version_number + 1) if latest_published else 1

        with transaction.atomic():
            draft = ProjectDesignVersion.objects.create(
                design=design,
                version_number=next_version_number,
                title=data.get('title', ''),
                notes=data.get('notes', ''),
                status='draft',
                is_locked=False,
                created_by=request.user,
            )

            copy_from_id = data.get('copy_from_version_id')
            if copy_from_id:
                src = design.versions.filter(id=copy_from_id).first()
                if not src:
                    return Response({'error': 'Source version not found'}, status=status.HTTP_400_BAD_REQUEST)
                items = list(src.items.all().order_by('sort_order', 'id'))
                bulk = [
                    DesignItem(
                        version=draft,
                        item_name=i.item_name,
                        equipment_code=i.equipment_code,
                        category=i.category,
                        model=i.model,
                        manufacturer=i.manufacturer,
                        attributes=i.attributes,
                        remarks=i.remarks,
                        sort_order=i.sort_order,
                        is_category=i.is_category,
                    ) for i in items
                ]
                DesignItem.objects.bulk_create(bulk)
                draft.items_count = len(bulk)
                draft.save(update_fields=['items_count'])

            design.current_version = draft
            design.save(update_fields=['current_version', 'updated_at'])

        return Response(ProjectDesignVersionSerializer(draft).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='design/versions/(?P<version_id>[^/.]+)/publish')
    def publish_version(self, request, pk=None, version_id=None):
        project = self.get_object()
        design = self._get_or_create_design(project)
        version = design.versions.filter(id=version_id, status='draft').first()
        if not version:
            return Response({'error': 'Draft version not found'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce max 5 published versions per project
        if design.versions.filter(status='published').count() >= 5:
            return Response({'error': 'Maximum 5 published versions reached. Delete old versions to publish more.'}, status=status.HTTP_400_BAD_REQUEST)

        # Require at least one item to publish
        if version.items.count() == 0:
            return Response({'error': 'At least one item is required to publish the design.'}, status=status.HTTP_400_BAD_REQUEST)

        version.status = 'published'
        version.is_locked = True
        version.published_at = timezone.now()
        version.save(update_fields=['status', 'is_locked', 'published_at'])

        design.current_version = version
        design.save(update_fields=['current_version', 'updated_at'])

        return Response(ProjectDesignVersionSerializer(version).data)

    @action(detail=True, methods=['get', 'post'], url_path='design/versions/(?P<version_id>[^/.]+)/items')
    def version_items(self, request, pk=None, version_id=None):
        project = self.get_object()
        design = self._get_or_create_design(project)
        version = design.versions.filter(id=version_id).first()
        if not version:
            return Response({'error': 'Version not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.method.lower() == 'get':
            return Response(DesignItemSerializer(version.items.all().order_by('sort_order', 'id'), many=True).data)

        # POST - create item (only allowed for draft)
        if version.status != 'draft' or version.is_locked:
            return Response({'error': 'Version is locked or not a draft'}, status=status.HTTP_400_BAD_REQUEST)

        item_ser = CreateDesignItemRequestSerializer(data=request.data)
        item_ser.is_valid(raise_exception=True)
        data = item_ser.validated_data

        # Compute sort order
        next_order = (version.items.aggregate(m=models.Max('sort_order'))['sort_order__max'] or 0) + 1
        item = DesignItem.objects.create(version=version, sort_order=next_order, **data)
        version.items_count = version.items.count()
        version.save(update_fields=['items_count'])

        return Response(DesignItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='design/versions/(?P<version_id>[^/.]+)/items/reorder')
    def version_items_reorder(self, request, pk=None, version_id=None):
        project = self.get_object()
        design = self._get_or_create_design(project)
        version = design.versions.filter(id=version_id, status='draft').first()
        if not version:
            return Response({'error': 'Draft version not found'}, status=status.HTTP_404_NOT_FOUND)

        src_index = request.data.get('from_index')
        dst_index = request.data.get('to_index')
        if not isinstance(src_index, int) or not isinstance(dst_index, int):
            return Response({'error': 'from_index and to_index must be integers'}, status=status.HTTP_400_BAD_REQUEST)

        items = list(version.items.all().order_by('sort_order', 'id'))
        if not (0 <= src_index < len(items)) or not (0 <= dst_index < len(items)):
            return Response({'error': 'Index out of range'}, status=status.HTTP_400_BAD_REQUEST)

        moving = items.pop(src_index)
        items.insert(dst_index, moving)
        for idx, it in enumerate(items):
            if it.sort_order != idx:
                it.sort_order = idx
        DesignItem.objects.bulk_update(items, ['sort_order'])
        return Response({'ok': True})

    @action(detail=True, methods=['delete'], url_path='design/versions/(?P<version_id>[^/.]+)')
    def delete_version(self, request, pk=None, version_id=None):
        """Delete a design version. Drafts and published versions are allowed.
        For published deletion, current_version will be moved to the latest remaining published (if any)."""
        project = self.get_object()
        design = self._get_or_create_design(project)
        version = design.versions.filter(id=version_id).first()
        if not version:
            return Response(status=status.HTTP_204_NO_CONTENT)
        was_published = (version.status == 'published')
        version.delete()
        if was_published:
            latest_published = design.versions.filter(status='published').order_by('-version_number').first()
            design.current_version = latest_published
            design.save(update_fields=['current_version'])
        else:
            if design.current_version_id == int(version_id):
                design.current_version = None
                design.save(update_fields=['current_version'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='design/versions/(?P<version_id>[^/.]+)/items/bulk')
    def version_items_bulk(self, request, pk=None, version_id=None):
        """Bulk create items in a draft version. Accepts list under 'create'."""
        project = self.get_object()
        design = self._get_or_create_design(project)
        version = design.versions.filter(id=version_id, status='draft').first()
        if not version:
            return Response({'error': 'Draft version not found'}, status=status.HTTP_404_NOT_FOUND)

        create_list = request.data.get('create') or []
        replace_all = bool(request.data.get('replace'))
        if not isinstance(create_list, list):
            return Response({'error': 'create must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        if replace_all:
            version.items.all().delete()

        existing_count = version.items.count()
        bulk_items = []
        order_cursor = existing_count
        for raw in create_list:
            ser = CreateDesignItemRequestSerializer(data=raw)
            ser.is_valid(raise_exception=True)
            payload = ser.validated_data
            bulk_items.append(DesignItem(
                version=version,
                item_name=payload.get('item_name', ''),
                equipment_code=payload.get('equipment_code', ''),
                category=payload.get('category', ''),
                model=payload.get('model', ''),
                manufacturer=payload.get('manufacturer', ''),
                attributes=payload.get('attributes', None),
                remarks=payload.get('remarks', ''),
                sort_order=order_cursor,
                is_category=bool(payload.get('is_category', False)),
            ))
            order_cursor += 1

        if bulk_items:
            DesignItem.objects.bulk_create(bulk_items)
            version.items_count = version.items.count()
            version.save(update_fields=['items_count'])

        return Response({'created': len(bulk_items)}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced project search"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset()
        
        # Apply date range filters if provided
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_date__lte=date_to)
        
        # Apply standard filters
        queryset = self.filter_queryset(queryset)
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProjectSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ProjectSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a project (soft delete)"""
        project = self.get_object()
        
        if project.status == 'active':
            return Response(
                {'error': 'Cannot archive active project. Change status first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add archived status if not exists in choices
        project.status = 'cancelled'
        project.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Project {project.name} archived by {request.user.email}")
        
        return Response({'message': 'Project archived successfully'})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a project with new name"""
        original_project = self.get_object()
        new_name = request.data.get('name')
        
        if not new_name:
            return Response(
                {'error': 'New project name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if project with new name already exists
        tenant = getattr(request, 'tenant', None)
        if Project.objects.filter(tenant=tenant, name=new_name).exists():
            return Response(
                {'error': 'Project with this name already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create duplicate project (no team data in Phase 1)
            new_project = Project.objects.create(
                tenant=original_project.tenant,
                name=new_name,
                description=f"Copy of {original_project.description}",
                project_type=original_project.project_type,
                status='planning',
                client_tenant=original_project.client_tenant,
                customer_name=original_project.customer_name,
                circle=original_project.circle,
                activity=original_project.activity,
                start_date=original_project.start_date,
                end_date=original_project.end_date,
                scope=original_project.scope,
                created_by=request.user
            )
        
        logger.info(f"Project {original_project.name} duplicated as {new_name} by {request.user.email}")
        
        return Response(ProjectDetailSerializer(new_project).data, status=status.HTTP_201_CREATED)

    # -----------------------------
    # Phase 3 - Project ↔ Site Association
    # -----------------------------

    @action(detail=True, methods=['get'], url_path='sites')
    def list_sites(self, request, pk=None):
        project = self.get_object()
        links = ProjectSite.objects.filter(project=project, is_active=True).select_related('site')
        data = ProjectSiteSerializer(links, many=True).data
        return Response(data)

    @action(detail=True, methods=['get'], url_path='sites/count')
    def sites_count(self, request, pk=None):
        """Return count of active linked sites for this project.

        This avoids any accidental use of master sites count on the frontend.
        """
        project = self.get_object()
        count = ProjectSite.objects.filter(project=project, is_active=True).count()
        return Response({'site_count': count})

    @action(detail=True, methods=['post'], url_path='sites/link')
    def link_sites(self, request, pk=None):
        project = self.get_object()
        ser = LinkSitesRequestSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        site_ids = ser.validated_data['site_ids']
        alias = ser.validated_data.get('alias_name', '').strip()

        created = 0
        skipped = 0
        with transaction.atomic():
            existing = set(ProjectSite.objects.filter(project=project, site_id__in=site_ids).values_list('site_id', flat=True))
            to_create = []
            for sid in site_ids:
                if sid in existing:
                    skipped += 1
                    continue
                to_create.append(ProjectSite(project=project, site_id=sid, alias_name=alias, created_by=request.user))
            if to_create:
                ProjectSite.objects.bulk_create(to_create)
                created = len(to_create)

        return Response({'linked': created, 'skipped': skipped, 'errors': []}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='sites/(?P<link_id>[^/.]+)')
    def unlink_site(self, request, pk=None, link_id=None):
        project = self.get_object()
        link = ProjectSite.objects.filter(project=project, id=link_id).first()
        if not link:
            return Response(status=status.HTTP_204_NO_CONTENT)
        link.is_active = False
        link.save(update_fields=['is_active', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='sites/import')
    def import_sites(self, request, pk=None):
        """Import/link sites from Excel/CSV. Creates missing master sites for tenant.
        Template columns: site_id, global_id, site_name, town, cluster, address, latitude, longitude
        """
        project = self.get_object()
        upload_ser = ImportProjectSitesUploadSerializer(data=request.data)
        upload_ser.is_valid(raise_exception=True)
        file = request.FILES['file']

        import pandas as pd
        try:
            if file.name.lower().endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                df = pd.read_csv(file)
        except Exception as e:
            return Response({'error': f'Failed to read file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        required = ['site_id', 'global_id', 'site_name', 'cluster', 'latitude', 'longitude']
        missing = [c for c in required if c not in df.columns]
        if missing:
            return Response({'error': f'Missing required columns: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)

        tenant = getattr(request, 'tenant', None)
        created_master = 0
        linked = 0
        skipped = 0
        errors = []

        with transaction.atomic():
            for idx, row in df.iterrows():
                rownum = idx + 2
                try:
                    site_id_val = str(row.get('site_id') or '').strip()
                    global_id_val = str(row.get('global_id') or '').strip()
                    site_name_val = str(row.get('site_name') or '').strip()
                    town_val = str(row.get('town') or '').strip()
                    cluster_val = str(row.get('cluster') or '').strip()
                    address_val = str(row.get('address') or '').strip()
                    lat_val = float(row.get('latitude'))
                    lng_val = float(row.get('longitude'))

                    if not all([site_id_val, global_id_val, site_name_val, cluster_val]):
                        errors.append({'row': rownum, 'error': 'site_id, global_id, site_name, cluster required'})
                        continue

                    # find or create master site
                    site = Site.objects.filter(tenant=tenant, site_id=site_id_val, deleted_at__isnull=True).first()
                    if not site:
                        if not (-90 <= lat_val <= 90) or not (-180 <= lng_val <= 180):
                            errors.append({'row': rownum, 'error': 'Invalid coordinates'})
                            continue
                        if Site.objects.filter(tenant=tenant, global_id=global_id_val, deleted_at__isnull=True).exists():
                            errors.append({'row': rownum, 'error': f'Global ID {global_id_val} already exists'})
                            continue
                        site = Site.objects.create(
                            tenant=tenant,
                            created_by=request.user,
                            site_id=site_id_val,
                            global_id=global_id_val,
                            site_name=site_name_val,
                            town=town_val,
                            cluster=cluster_val,
                            latitude=lat_val,
                            longitude=lng_val,
                            address=address_val,
                            name=site_name_val,
                            city=town_val,
                            site_code=site_id_val,
                        )
                        created_master += 1

                    # link to project (idempotent)
                    link, created = ProjectSite.objects.get_or_create(
                        project=project,
                        site=site,
                        defaults={'alias_name': '', 'created_by': request.user}
                    )
                    if created:
                        linked += 1
                    else:
                        skipped += 1
                except Exception as e:
                    errors.append({'row': rownum, 'error': str(e)})

        return Response({
            'created_master': created_master,
            'linked': linked,
            'skipped': skipped,
            'errors': errors[:50],
            'has_more_errors': len(errors) > 50
        }, status=status.HTTP_200_OK)


class ProjectTeamMemberViewSet:  # Deprecated in Phase 1
    pass