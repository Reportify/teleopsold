from django.db import models
from django.utils.translation import gettext_lazy as _


class Invoice(models.Model):
    """Invoice model for billing"""
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ], default='draft')
    due_date = models.DateField()
    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'invoices'
        verbose_name = _('Invoice')
        verbose_name_plural = _('Invoices')

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.tenant.name}" 