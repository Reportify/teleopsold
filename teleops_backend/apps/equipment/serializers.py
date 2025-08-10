from rest_framework import serializers
from .models import EquipmentInventoryItem, TechnologyTag


class TechnologyTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnologyTag
        fields = [
            'id', 'name', 'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EquipmentInventoryItemSerializer(serializers.ModelSerializer):
    technologies = serializers.SlugRelatedField(
        many=True,
        required=False,
        slug_field='name',
        queryset=TechnologyTag.objects.all(),
    )

    class Meta:
        model = EquipmentInventoryItem
        fields = [
            'id', 'name', 'description', 'material_code', 'category', 'sub_category',
            'manufacturer', 'unit_of_measurement', 'specifications', 'is_active',
            'technologies', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        # Tenant scoping: limit technologies queryset to current tenant
        request = self.context.get('request')
        if request and 'technologies' in self.fields and 'technologies' in attrs:
            tenant = getattr(request, 'tenant', None)
            if tenant:
                attrs['technologies'] = [
                    TechnologyTag.objects.get_or_create(
                        tenant=tenant, name=tag.name, defaults={
                            'description': '', 'created_by': getattr(request.user, 'id', None)
                        }
                    )[0]
                    for tag in attrs['technologies']
                ]
        # Normalize material_code
        name_val = attrs.get('name') or ''
        code = attrs.get('material_code')
        if code is not None:
            import re
            code_str = str(code).strip()
            if code_str.lower() in {'na', 'n/a', 'null', 'none', '-'}:
                attrs['material_code'] = ''
            else:
                def sanitize(s: str) -> str:
                    return re.sub(r'[^A-Za-z0-9]', '', s).lower()
                if sanitize(code_str) in {sanitize(name_val), sanitize(name_val) + '1'}:
                    attrs['material_code'] = ''
                else:
                    attrs['material_code'] = code_str.replace(' ', '').upper()
        return attrs


class EquipmentBulkUploadResultSerializer(serializers.Serializer):
    created = serializers.IntegerField()
    updated = serializers.IntegerField()
    skipped = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())


