# Analyse Architecture Multi-Tenant — GestionScolaire

**Date :** 30 Juin 2026  
**Auteur :** Analyse technique  
**Statut :** À valider avant implémentation

---

## 1. Objectifs métier

1. **SaaS licencié** : L'application sera vendue sous licence aux écoles. L'utilisateur Omar (super admin) peut activer/désactiver toute école cliente en cas de non-paiement.
2. **Isolation des données** : Chaque école cliente voit UNIQUEMENT ses propres données (élèves, notes, paiements, etc.). Aucune fuite entre tenants.
3. **Hiérarchie des rôles étendue** :
   - **Super Admin** (Omar) : voit et gère tous les tenants, pas de données d'école qui lui sont propres
   - **Admin d'école** (client) : gère son école, crée ses utilisateurs, leur assigne des permissions
   - **Utilisateurs d'école** (enseignant, comptable, etc.) : créés par l'admin de l'école, accès limité à leur rôle dans cette école

---

## 2. État actuel (constat technique)

### Base de données
- 26 modèles Django répartis dans 16 apps
- Aucun modèle n'a de champ `tenant` ou `school`
- `SchoolInfo` est un singleton (une seule ligne dans la DB)
- Les années académiques sont des `CharField` en texte libre reproduits dans 8 modèles

### Accès et permissions
- `auth.User` par défaut (pas de `CustomUser`)
- `UserProfile` en OneToOne avec `auth.User`, contient le `role`
- `Role` model + permissions JSON pour le contrôle d'accès par module
- **Aucune notion de tenant** dans le système de permissions

### Principaux modèles à migrer

| App | Modèles | Priorité tenant |
|-----|---------|-----------------|
| `accounts` | UserProfile, ActivityLog, LoginAttempt, LoginLockout | **Critique** |
| `school` | AcademicYear, Semester, SchoolInfo | **Critique** |
| `students` | Student, Parent | **Critique** |
| `teachers` | Teacher, SalaryHistory | **Critique** |
| `classes` | Cycle, Class, ScheduleEntry | **Critique** |
| `subjects` | Subject, TeacherSubject | **Critique** |
| `grades` | Grade, StudentAverage, GradeHistory, Term | **Critique** |
| `payments` | Payment, FeeType | **Critique** |
| `attendance` | Attendance | **Critique** |
| `communication` | Message, Notification | **Critique** |
| `dashboard` | Statistic, ActivityLog | **Moyenne** |
| `rooms` | Room | **Critique** |
| `results` | ClassResult | **Critique** |
| `registrations` | Registration | **Critique** |
| `mobile_payments` | MobilePaymentProvider, MobilePaymentTransaction | **Moyenne** |
| `products` | Category, Product (inactif) | **Faible** |

---

## 3. Architecture cible

```
                    ┌──────────────────────────────────────────────┐
                    │           SUPER ADMIN (Omar)                │
                    │  - Gère les licences (créer/activer/désactiver)│
                    │  - Voit tous les tenants                     │
                    │  - Pas de données d'école personnelles       │
                    │  - tenant = NULL                             │
                    └──────────┬───────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────────┐
           │                   │                       │
    ┌──────▼──────┐    ┌──────▼──────┐    ┌──────────▼──────┐
    │  École A    │    │  École B    │    │  École C        │
    │  Tenant 1   │    │  Tenant 2   │    │  Tenant 3       │
    ├─────────────┤    ├─────────────┤    ├──────────────────┤
    │ Admin École │    │ Admin École │    │ Admin École     │
    │ Enseignants │    │ Enseignants │    │ Enseignants     │
    │ Élèves      │    │ Élèves      │    │ Élèves          │
    │ Notes       │    │ Notes       │    │ Notes           │
    │ Paiements   │    │ Paiements   │    │ Paiements       │
    └─────────────┘    └─────────────┘    └──────────────────┘
      Données 100%       Données 100%       Données 100%
      isolées            isolées            isolées
```

### Base de données unique avec isolation par clé étrangère

Stratégie choisie : **Shared database, row-level isolation** (une seule base PostgreSQL, chaque ligne appartient à un tenant via une FK `tenant`).

**Pourquoi pas `django-tenants` (schemas PostgreSQL) ?**
- Plus complexe à mettre en œuvre sur l'existant
- Les schémas multiplient les migrations
- L'isolation par FK est suffisante et plus simple à déboguer

---

## 4. Nouveau modèle : `Tenant`

```python
class Tenant(models.Model):
    name = models.CharField(max_length=200, verbose_name="Nom de l'école")
    subdomain = models.CharField(max_length=50, unique=True, verbose_name="Sous-domaine")
    license_key = models.CharField(max_length=100, unique=True, verbose_name="Clé de licence")
    is_active = models.BooleanField(default=True, verbose_name="Actif")
    license_expiry = models.DateField(null=True, blank=True, verbose_name="Expiration licence")
    max_users = models.IntegerField(default=10, verbose_name="Max utilisateurs")
    max_students = models.IntegerField(default=500, verbose_name="Max élèves")
    contact_email = models.EmailField(blank=True, verbose_name="Email contact")
    contact_phone = models.CharField(max_length=15, blank=True, verbose_name="Téléphone")
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='created_tenants', verbose_name="Créé par"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tenant (école cliente)"
        verbose_name_plural = "Tenants (écoles clientes)"

    def __str__(self):
        return f"{self.name} ({'actif' if self.is_active else 'inactif'})"
```

---

## 5. Ajout de `tenant` FK aux modèles existants

### Phase 1 : Modèles critiques (authentification et configuration)

| Modèle | Champ | Contrainte |
|--------|-------|------------|
| `UserProfile` | `tenant = ForeignKey(Tenant, null=True, blank=True)` | NULL pour super admin |
| `SchoolInfo` | `tenant = ForeignKey(Tenant, null=False)` | Remplacer le singleton |
| `AcademicYear` | `tenant = ForeignKey(Tenant, null=False)` | |
| `Semester` | `tenant = ForeignKey(Tenant, null=False)` (via AcademicYear) | |

### Phase 2 : Modèles métier

| Modèle | Champ | Note |
|--------|-------|------|
| `Student` | `tenant = ForeignKey(Tenant)` | |
| `Parent` | `tenant = ForeignKey(Tenant)` | |
| `Teacher` | `tenant = ForeignKey(Tenant)` | |
| `Class` | `tenant = ForeignKey(Tenant)` | |
| `Subject` | `tenant = ForeignKey(Tenant)` | |
| `Cycle` | `tenant = ForeignKey(Tenant)` | |
| `TeacherSubject` | via Teacher/Subject/Class | |
| `Grade` | via Student | |
| `Term` | `tenant = ForeignKey(Tenant)` | |
| `Payment` | via Student | |
| `FeeType` | `tenant = ForeignKey(Tenant)` | |
| `Attendance` | via Student | |
| `Room` | `tenant = ForeignKey(Tenant)` | |
| `Registration` | via Student | |
| `Notification` | via User.tenant | |
| `Message` | via User.tenant | |

**Stratégie :** Certaines entités hériteront du tenant via leur FK parent plutôt que d'avoir leur propre champ `tenant`. Exemple : `Grade.student.tenant` plutôt que `Grade.tenant`. Cela évite la redondance mais complexifie les requêtes.

→ **Décision** : Ajouter `tenant` DIRECTEMENT sur chaque modèle majeur pour des requêtes simples et rapides (principe de dénormalisation contrôlée).

---

## 6. Middleware Tenant

```python
class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = None
        # 1. Déterminer le tenant depuis l'utilisateur connecté
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            tenant = request.user.profile.tenant
        # 2. Fallback : sous-domaine (pour accès non authentifié)
        if not tenant:
            host = request.get_host().split('.')[0]
            tenant = Tenant.objects.filter(subdomain=host, is_active=True).first()
        request.tenant = tenant
        return self.get_response(request)
```

---

## 7. ViewSet de base tenant-aware

```python
class TenantViewSet(viewsets.ModelViewSet):
    """ViewSet de base qui filtre automatiquement par tenant."""

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated:
            role = get_user_role(user)
            if role == 'super_admin':
                # Super admin voit tout (peut filtrer par tenant via query param)
                tenant_id = self.request.query_params.get('tenant_id')
                if tenant_id:
                    qs = qs.filter(tenant_id=tenant_id)
                return qs
            # Utilisateur normal : filtré par son tenant
            if hasattr(self.queryset.model, 'tenant'):
                qs = qs.filter(tenant=user.profile.tenant)
        return qs

    def perform_create(self, serializer):
        # Assigner automatiquement le tenant à la création
        if hasattr(serializer, 'tenant') or 'tenant' in serializer.fields:
            serializer.save(tenant=self.request.user.profile.tenant)
        else:
            serializer.save()
```

---

## 8. Interface Super Admin (Licences)

### Côté backend (Django)
- `TenantViewSet` complet (CRUD)
- Action `toggle_activation(tenant_id)` → active/désactive
- Action `check_license(tenant_id)` → vérifie expiration
- Vue `pending_tenants` → liste des demandes d'inscription en attente
- Notification aux admins quand un nouveau tenant s'inscrit

### Côté frontend (React)
- Nouvel onglet « Licences » visible uniquement par super_admin
- Tableau : Nom, Sous-domaine, Statut, Expiration, Utilisateurs/élèves utilisés
- Boutons : Activer/Désactiver, Modifier, Voir détails
- Badge rouge si licence expirée ou presque expirée
- Formulaire de création manuelle d'un nouveau tenant
- Liste des demandes d'inscription en attente

---

## 9. Flux d'inscription client

```
1. Nouveau client → page /register
2. Remplit : nom école, email, mot de passe admin
3. POST /api/tenants/register/
   → Crée Tenant (is_active=False, statut='pending')
   → Crée User (admin de l'école)
   → Crée UserProfile (role='admin', tenant=tenant)
4. Super Admin reçoit notification (nouvelle demande)
5. Super Admin → interface Licences → active le tenant
6. Client reçoit email de confirmation
7. Client se connecte → Dashboard de son école
```

---

## 10. Plan d'implémentation par phases

### Phase 1 — Fondations (prioritaire)
- [ ] Créer le modèle `Tenant` + migration `0001_tenant`
- [ ] Ajouter `tenant` à `UserProfile` (nullable) + migration
- [ ] Ajouter `tenant` à `SchoolInfo` + briser le singleton
- [ ] Ajouter `tenant` à `AcademicYear` + `Semester`
- [ ] Middleware tenant
- [ ] ViewSet de base `TenantViewSet`
- [ ] Backfill : migration de données pour assigner le tenant par défaut aux enregistrements existants
- [ ] Interface Super Admin (backend + frontend)

### Phase 2 — Isolation des données métier
- [ ] Ajouter `tenant` à `Student`, `Teacher`, `Class`, `Cycle`, `Subject`
- [ ] Ajouter `tenant` à `Payment`, `FeeType`, `Grade`, `Term`
- [ ] Ajouter `tenant` à `Attendance`, `Room`, `Registration`
- [ ] Adapter TOUS les viewsets existants pour hériter de `TenantViewSet`
- [ ] Adapter TOUS les serializers pour inclure/exclure `tenant`

### Phase 3 — Inscription et licence
- [ ] Endpoint `register` pour les nouveaux clients
- [ ] Workflow d'activation/désactivation
- [ ] Vérification licence au login (bloquer si inactif/expiré)
- [ ] Limite d'utilisateurs/élèves (vérifier au create)

### Phase 4 — Finalisation
- [ ] Tests d'isolation (un tenant ne voit pas les données d'un autre)
- [ ] Nettoyage des migrations
- [ ] Documentation mise à jour

---

## 11. Risques et atténuations

| Risque | Impact | Atténuation |
|--------|--------|-------------|
| Une vue existante oublie de filtrer par tenant | Fuite de données | ViewSet de base obligatoire + tests d'isolation |
| Perte de performances avec les filtres tenant | Ralentissement | Index sur `tenant_id` + select_related |
| Migration longue sur la base de production | Downtime | Migrations par phases, backfill progressif |
| Complexité pour le super admin d'accéder aux données d'un tenant | Ergonomie | Query param `?tenant_id=X` sur toutes les listes |
| Rupture de l'existant pendant la migration | Blocage | Phase 1 sans casser le comportement actuel |

---

## 12. Questions en suspens

1. **Sous-domaine ou chemin URL ?** → Sous-domaine recommandé (`ecole-a.gestionecole.com`)
2. **Base de données séparée par tenant ?** → Non, DB unique + FK tenant (plus simple)
3. **Le super admin peut-il se connecter à un tenant pour dépanner ?** → Oui, via un mécanisme d'impersonation
4. **Stockage des fichiers médias par tenant ?** → Dossier `media/tenants/{tenant_id}/` sur Cloudinary
5. **Les rôles (Role model) sont-ils globaux ou par tenant ?** → Globaux (partagés), seuls les utilisateurs sont isolés
6. **Que faire des données de démo existantes ?** → Les assigner à un tenant par défaut "Démo"

---

**Prochaine étape :** Validation de cette analyse par l'équipe, puis début de l'implémentation Phase 1.
