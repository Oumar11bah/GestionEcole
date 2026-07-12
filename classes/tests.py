from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory

from classes.models import Cycle
from classes.views import CycleViewSet
from tenants.models import Tenant


class CycleViewSetTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name='École Test',
            subdomain='ecole-test',
            license_key='license-test-123',
        )
        self.user = User.objects.create_user(username='tester', password='1234')
        self.user.profile.tenant = self.tenant
        self.user.profile.role = 'admin'
        self.user.profile.save()

    def test_get_queryset_deduplicates_cycles_for_tenant(self):
        Cycle.objects.create(name='primaire', tenant=None, description='Cycle global')
        Cycle.objects.create(name='primaire', tenant=self.tenant, description='Cycle tenant')
        Cycle.objects.create(name='college', tenant=self.tenant, description='Cycle tenant')

        factory = APIRequestFactory()
        request = factory.get('/classes/cycles/')
        request.user = self.user

        view = CycleViewSet()
        view.request = request

        queryset = view.get_queryset()

        self.assertEqual(queryset.filter(name='primaire').count(), 1)
        self.assertEqual(queryset.filter(name='college').count(), 1)
        self.assertEqual(queryset.filter(name='primaire').first().tenant, self.tenant)
        self.assertEqual(queryset.filter(name='college').first().tenant, self.tenant)
        self.assertEqual(len(queryset), len(set(queryset.values_list('name', flat=True))))
