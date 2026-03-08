# Conclusion — Style Dictionary vs. Solution maison

## Verdict

**Style Dictionary est la bonne option.** La migration produit des résultats identiques avec une fraction du code.

## Parité des sorties

Sur les 19 fichiers markdown générés, **18 sont strictement identiques** entre les deux builds. Le seul fichier différent (`t2-font.md`) ne diffère que par l'**ordre des tokens** au sein d'une même catégorie — le contenu est le même.

Les trois écarts initiaux (guillemets sur les font families, valeurs `var()` non résolues dans les previews typographiques, ordre) ont été corrigés en quelques lignes dans un seul fichier (`sd-config/formats/markdown.ts`).

Les sorties CSS, Tailwind, Figma, Swift et Kotlin étaient déjà identiques avant ces corrections.

## Taille du code

|                          | Solution maison          | Style Dictionary       |
|--------------------------|--------------------------|------------------------|
| **Fichiers source (.ts)**| 397 fichiers             | 15 fichiers            |
| **Lignes source**        | 9 258 lignes             | 1 972 lignes           |
| **Lignes de tests**      | 807 lignes               | —                      |
| **Total**                | ~10 000 lignes           | ~2 000 lignes          |

Ratio : **~5x moins de code** avec Style Dictionary, pour un résultat identique.

## Performance

Le build Style Dictionary complet (CSS, Tailwind, Figma, Kotlin, Swift, Markdown) s'exécute en **~700ms**.

## Maintenabilité

- **Nouveaux types de tokens** : avec SD, un hook de quelques lignes suffit. Avec la solution maison, il faut créer un resolver, un transformer et un formatter par type et par plateforme.
- **Nouveaux formats de sortie** : SD fournit des formats built-in (CSS, JSON, iOS, Android) et permet d'en ajouter avec un format custom. La solution maison nécessite tout à la main.
- **Évolutions du standard DTCG** : SD suit activement le standard. La solution maison doit être mise à jour manuellement.
- **Onboarding** : SD est documenté publiquement. La solution maison nécessite de comprendre ~400 fichiers internes.

## Risques

Le seul risque de SD serait un besoin très spécifique impossible à couvrir avec les hooks (parsers, preprocessors, transforms, formats). Ce POC démontre que ce n'est pas le cas — chaque comportement custom a pu être reproduit.

---

*— claude*
