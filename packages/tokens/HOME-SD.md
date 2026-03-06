# Style Dictionary - Migration & Documentation

## Contexte

Le build des design tokens a ete migre d'un framework DTCG custom (`scripts/shared/dtcg/`) vers [Style Dictionary V5](https://styledictionary.com/) (`style-dictionary@^5.3.3`).

L'objectif : remplacer la solution maison par un outil standard de l'industrie, tout en produisant une **sortie fonctionnellement equivalente** et **sans modifier les fichiers tokens sources**.

---

## Commandes

### Build avec Style Dictionary (nouveau)

```bash
yarn build:tokens
```

Execute `sd-config/build.ts` qui utilise Style Dictionary V5 pour transformer les tokens sources en tous les formats de sortie.

Le build complet (tokens + copie vers demo/docs) :

```bash
yarn build
```

### Build legacy (ancien framework custom)

```bash
node --no-warnings=ExperimentalWarning scripts/scripts/build-tokens/build-tokens.script.ts
```

Utilise le framework DTCG custom dans `scripts/shared/dtcg/`.

---

## Architecture Style Dictionary

### Structure des fichiers

```
sd-config/
  build.ts              # Orchestrateur principal (entry point)
  preprocessors.ts      # Parser custom + preprocesseurs
  transforms.ts         # Transforms custom (name, typography)
  helpers.ts            # Utilitaires partages (nommage CSS, constantes)
  build/
    context.ts          # BuildContext, utilitaires partages (collectTokens, writeFileSafe, etc.)
    css.ts              # Output CSS base (tokens.root.css, tokens.attr.css)
    css-modifiers.ts    # Output CSS modifiers (theme/product overrides + REDECLARED)
    tailwind.ts         # Output Tailwind (@theme inline)
    figma.ts            # Output Figma JSON (orchestration des modes)
    kotlin.ts           # Output Kotlin Compose (Color constants)
    swift.ts            # Output Swift/iOS (XCAssets color sets)
    markdown.ts         # Output Markdown (preview tables)
    package.ts          # Generation du package (package.json, README, LICENSE)
  formats/
    figma.ts            # Constructeur de l'arbre JSON Figma (avec modes de theme)
    markdown.ts         # Generateur de tables Markdown avec previews HTML
```

### Outputs generes

| Output | Chemin | Description |
|--------|--------|-------------|
| CSS (base) | `dist/web/css/tokens.{root,attr}.css` | Tous les tokens en CSS custom properties |
| CSS (modifiers) | `dist/web/css/modifiers/{modifier}/{context}.{root,attr}.css` | Overrides theme/produit avec references redeclarees |
| Tailwind | `dist/web/tailwind.css` | `@theme inline` avec variables CSS mappees |
| Figma | `dist/figma.tokens.json` | Arbre de tokens avec valeurs T1 et modes T2 (light/dark) |
| Kotlin | `dist/android/compose/EsdsColorRawTokens.kt` | Constantes Compose `Color()` (couleurs T1) |
| Swift/iOS | `dist/ios/Colors.xcassets/` | Color sets XCAssets avec composantes sRGB (couleurs T1) |
| Markdown | `dist/markdown/*.md` | Tables HTML de preview par tier/categorie |

---

## Hooks custom

Les tokens sources utilisent des formats de valeurs non-standard que Style Dictionary ne parse pas nativement. Le build s'appuie donc sur des hooks custom :

### Parser : `esds/fix-type-inheritance`

**Fichier** : `preprocessors.ts`

**Probleme** : SD5 merge tous les fichiers JSON sources. Si plusieurs fichiers definissent un `$type` a la racine (ex: un fichier `color`, un autre `typography`), le dernier ecrase tous les autres.

**Solution** : Le parser intercepte chaque fichier `.tokens.json` avant le merge et deplace le `$type` racine dans chaque groupe de premier niveau. Ainsi chaque groupe conserve son type apres la fusion.

### Preprocesseurs

**Fichier** : `preprocessors.ts`

- **`esds/normalize-colors`** : Convertit les objets couleur `{ hex, colorSpace, components }` en simples strings hex (`"#ff0000"`).
- **`esds/normalize-dimensions`** : Convertit les objets dimension `{ value, unit }` en strings (`"16px"`).

### Transforms

**Fichier** : `transforms.ts`

- **`esds/name`** : Replique la convention de nommage CSS exacte du framework custom (camelCase vers dash-case, suppression des caracteres speciaux, filtrage des segments vides).
- **`esds/typography-shorthand`** : Convertit les tokens typography composites en shorthand CSS `font` avec des references `var()` : `var(--esds-font-weight) var(--esds-font-size)/var(--esds-line-height) var(--esds-font-family)`.

---

## Build des modifiers

Pour chaque modifier (theme `dark`/`light`, produit `kdrive`/`mail`/etc.), le build :

1. Cree une instance SD avec les sources de base + le fichier modifier
2. Identifie les tokens **directement modifies** (valeur differente de la base, provenant du fichier modifier)
3. Identifie les tokens **redeclares** (tokens qui referencent un token modifie via `var()`)
4. Genere le CSS avec les deux groupes separes par un commentaire `/* REDECLARED */`

---

## Decisions techniques

### Pourquoi des preprocesseurs et pas les transforms built-in de SD ?

Les transforms SD operent sur des valeurs deja parsees. Nos valeurs non-standard (`{ hex }`, `{ value, unit }`) doivent etre normalisees **avant** que SD les traite. Les preprocesseurs interviennent au bon moment dans le pipeline.

### Pourquoi `expand: false` ?

Par defaut, SD5 explose les tokens composites (typography, shadow) en sous-proprietes individuelles. On veut garder la typography comme **une seule** variable CSS (font shorthand), donc on desactive l'expansion.

### Pourquoi pas les formats built-in de SD ?

Le build genere les fichiers de sortie manuellement (sans utiliser `sd.buildPlatform()`) pour avoir un controle total sur :
- L'ordre des tokens (tri par tier puis par fichier)
- La preservation des references comme `var(--esds-...)`
- La logique REDECLARED dans les modifiers
- Les formats multi-fichiers (Markdown, XCAssets)
