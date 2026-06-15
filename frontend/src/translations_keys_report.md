# Translation Keys Report

## Results.jsx (newly added)
| Key | Original French |
|---|---|
| `results.title` | Résultats académiques |
| `results.subtitle` | Consultez les résultats par classe et par cycle |
| `results.by_class` | Par classe |
| `results.admis_failed` | Admis / Échoués |
| `results.academic_year` | Année scolaire |
| `results.cycle` | Cycle |
| `results.all_classes` | Toutes les classes |
| `results.select` | -- Sélectionner -- |
| `results.refresh` | Rafraîchir |
| `results.results_singular` | résultat |
| `results.results_plural` | résultats |
| `results.reset` | Réinitialiser |
| `results.total_students` | Total élèves |
| `results.success_rate` | Taux de réussite |
| `results.passed` | admis |
| `results.failed` | échoués |
| `results.best_class` | Meilleure classe |
| `results.na` | N/A |
| `results.class` | Classe |
| `results.term` | Trimestre |
| `results.total` | Total |
| `results.average` | Moyenne |
| `results.best_student` | Meilleur élève |
| `results.rate` | Taux |
| `results.actions` | Actions |
| `results.loading` | Chargement... |
| `results.no_results` | Aucun résultat |
| `results.admis` | Admis |
| `results.load` | Charger |
| `results.students_singular` | élève |
| `results.students_plural` | élèves |
| `results.repeat` | Redouble |
| `results.best` | Meilleur |
| `results.search` | Rechercher... |
| `results.pdf` | PDF |
| `results.excel` | Excel |
| `results.print_admis` | Impr. admis |
| `results.print_failed` | Impr. échoués |
| `results.num` | N° |
| `results.matricule` | Matricule |
| `results.photo` | Photo |
| `results.last_name` | Nom |
| `results.first_name` | Prénom |
| `results.avg` | Moy. |
| `results.rank` | Rang |
| `results.mention` | Mention |
| `results.decision` | Décision |
| `results.no_student_found` | Aucun élève trouvé |
| `results.select_prompt` | Sélectionnez une classe et un trimestre, puis cliquez sur "Charger" |
| `results.admis_list` | Liste des admis |
| `results.student_s` | élève(s) |
| `results.print` | Imprimer |
| `results.name` | Nom & Prénom |
| `results.no_admis` | Aucun admis |

## Timetable.jsx (remaining additions)
| Key | Original French |
|---|---|
| `timetable.select` | -- Sélectionner -- (2 occurrences in form) |
| `timetable.principal` | Proviseur |
| `timetable.head_teacher` | Professeur Principal |
| `timetable.generated_on` | Généré le |
| `timetable.pdf_filename` | Emploi_du_temps |

## Registrations.jsx (remaining additions)
| Key | Original French |
|---|---|
| `registrations.select` | -- Sélectionner -- (in form dialog) |

## Grades.jsx (remaining additions)
| Key | Original French |
|---|---|
| `grades.excellent` | Excellent |
| `grades.very_good` | Très bien |
| `grades.good` | Bien |
| `grades.fairly_good` | Assez bien |
| `grades.passing` | Passable |
| `grades.fail` | Echec |

## Reports.jsx (remaining additions)
| Key | Original French |
|---|---|
| `reports.student` | Élève |
| `reports.payment` | Paiement |
| `reports.attendance` | Absence |
| `reports.grade` | Note |
| `reports.teacher` | Enseignant |
| `reports.class` | Classe |
| `reports.subject` | Matière |
| `reports.registration` | Inscription |
| `reports.room` | Salle |

## Notes
- Already existing keys from previous files (Payments, Registrations, Rooms, Timetable, Students, etc.) remain unchanged.
- Excluded from translation (data/configuration values): French month names (`Payments.jsx`), grade level names (`ClassForm.jsx`), default country `Guinée` (`Settings.jsx`), gender/role label maps (`Profile.jsx` - unused).
- Print receipt/document templates (standalone windows) use `t()` via JavaScript string interpolation.
- `statusConfig`, `methodLabels`, `decisionBadge` objects: data values left as-is, only display calls use `t()`.
- All rendered French strings are now behind `t()` keys.
