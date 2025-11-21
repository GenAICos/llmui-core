# 📢 CLAUSE SPÉCIALE ENTREPRISES - PUBLICATION OBLIGATOIRE

## Résumé de la nouvelle clause

Cette clause a été ajoutée à la licence AGPL v3 + Commons Clause de LLMUI Core pour garantir que les entreprises contribuent à l'écosystème open source.

---

## 🎯 Objectif

Empêcher les grandes entreprises de:
1. Prendre le code open source gratuitement
2. Le modifier en privé pour leurs besoins
3. Ne jamais contribuer leurs améliorations à la communauté

---

## ⚖️ Qui est concerné?

### ✅ SOUMIS à la publication obligatoire:

**Entreprises** définies comme toute entité ayant:
- **Plus de 5 employés**, OU
- **Un chiffre d'affaires annuel** (peu importe le montant), OU
- **Une structure commerciale** (Inc., SARL, SA, LLC, Corporation, etc.)

**Exemples**:
- ✅ Startup de 10 personnes → SOUMIS
- ✅ PME de 50 employés → SOUMIS
- ✅ Grande entreprise (Google, Microsoft, etc.) → SOUMIS
- ✅ Cabinet de consulting incorporé avec employés → SOUMIS

### ❌ EXEMPTÉS de la publication obligatoire:

- ❌ **Particuliers** travaillant seuls
- ❌ **Étudiants** (même s'ils font un stage en entreprise)
- ❌ **Chercheurs académiques** (universités)
- ❌ **Organisations à but non lucratif** (OBNL, associations, fondations)
- ❌ **Freelances solo** (< 5 employés, pas incorporé ou seul)

**Exemples**:
- ❌ Développeur indépendant solo → EXEMPTÉ
- ❌ Étudiant en maîtrise → EXEMPTÉ
- ❌ Professeur d'université → EXEMPTÉ
- ❌ Association communautaire → EXEMPTÉ

---

## 📋 Obligations précises pour les ENTREPRISES

Si vous modifiez LLMUI Core, vous devez:

### 1. 📢 PUBLIER le code modifié
- Sur un dépôt Git **public** (GitHub, GitLab, Codeberg, etc.)
- Avec un lien **accessible à tous** (pas de dépôt privé)
- Avec la **même licence** (AGPL v3 + Commons Clause)

### 2. ⏱️ Dans les 30 JOURS
- À partir de la **première utilisation** (interne ou externe)
- Pas de délai supplémentaire
- Le compte commence dès que le code modifié est exécuté

### 3. 📝 DOCUMENTER les modifications
- Décrire clairement ce qui a été changé
- Expliquer pourquoi (optionnel mais recommandé)
- Maintenir un fichier CHANGES.md ou similaire

### 4. 🔓 MAINTENIR le dépôt public
- Pendant **toute la durée d'utilisation**
- Vous ne pouvez pas le rendre privé plus tard
- Si vous arrêtez d'utiliser, vous pouvez archiver le dépôt

### 5. 👤 CRÉDITER l'auteur original
- Mention de François Chalut dans le README
- Lien vers le projet original
- Respect des notices de copyright

---

## ⚠️ IMPORTANT: Même pour usage INTERNE

Cette clause s'applique **MÊME SI**:
- ❌ Vous n'utilisez le logiciel qu'en interne
- ❌ Vous ne le distribuez pas à l'extérieur
- ❌ Vous n'offrez pas de service réseau
- ❌ Les modifications sont mineures (bug fixes, UI, etc.)

**Exemple concret**:

```
Une entreprise de 20 employés:
1. Télécharge LLMUI Core
2. Modifie l'interface pour l'adapter à leur charte graphique
3. L'utilise uniquement sur leur serveur interne

→ OBLIGATION: Publier le code modifié sous 30 jours sur GitHub
```

---

## 🚫 Que se passe-t-il en cas de non-respect?

### Sanctions immédiates:

1. **Révocation de la licence**
   - Perte immédiate et **permanente** du droit d'utiliser le logiciel
   - Obligation de **cesser toute utilisation**

2. **Actions légales**
   - **Dommages et intérêts** selon les lois applicables
   - **Frais juridiques** à votre charge
   - Poursuites au **Québec, Canada**

3. **Publication de la violation**
   - La violation peut être **rendue publique**
   - Atteinte à la **réputation** de l'entreprise
   - Liste publique des violations (Hall of Shame)

---

## ✅ Comment se conformer (Guide pratique)

### Étape 1: Déterminer si vous êtes soumis
```
Posez-vous la question:
- Ai-je plus de 5 employés? → OUI = Entreprise
- Mon entité a-t-elle des revenus? → OUI = Entreprise
- Suis-je incorporé (Inc., SARL)? → OUI = Entreprise

Si OUI à au moins une question → Vous êtes soumis
```

### Étape 2: Avant de modifier
```
1. Créez un dépôt Git public sur GitHub
2. Nommez-le clairement (ex: "llmui-core-company-fork")
3. Ajoutez le fichier LICENSE original
4. Ajoutez un README expliquant vos modifications
```

### Étape 3: Pendant le développement
```
1. Commitez régulièrement vos modifications
2. Documentez chaque changement important
3. Maintenez un fichier CHANGES.md
```

### Étape 4: Avant la première utilisation
```
1. Assurez-vous que le dépôt est public
2. Push tous vos commits
3. Ajoutez un lien vers le projet original
4. Créditez François Chalut
```

### Étape 5: Notification (optionnel mais recommandé)
```
Envoyez un email à contact@llmui.org avec:
- Nom de votre entreprise
- Lien vers votre dépôt public
- Brève description de vos modifications

Cela permet d'éviter tout malentendu
```

---

## 💡 Pourquoi cette clause?

### Problème identifié:

**Avant** (AGPL seul):
```
Grande entreprise:
1. Prend le code AGPL gratuit ✅
2. Modifie pour usage interne ✅
3. Ne distribue pas → Pas d'obligation de publier ✅
4. Garde toutes les améliorations privées ✅
5. La communauté ne bénéficie jamais de ces améliorations ❌
```

**Après** (AGPL + Clause entreprise):
```
Grande entreprise:
1. Prend le code AGPL gratuit ✅
2. Modifie pour usage interne ✅
3. DOIT publier sous 30 jours ⚠️
4. La communauté bénéficie des améliorations ✅
5. Écosystème open source renforcé ✅
```

### Bénéfices:

1. **Équité**: Les grandes entreprises contribuent autant qu'elles prennent
2. **Transparence**: Tout le monde voit ce qui est développé
3. **Innovation**: Les améliorations profitent à tous
4. **Communauté**: Écosystème plus fort et collaboratif
5. **Protection**: Empêche l'appropriation privée du code open source

---

## 🤔 Questions fréquentes spécifiques

### Q: Je suis une startup de 3 personnes, suis-je concerné?
**R**: NON, < 5 employés = exempté.

### Q: Je suis un freelance avec une SARL unipersonnelle?
**R**: NON, seul = exempté (même si structure commerciale).

### Q: Mon entreprise utilise LLMUI sans modifications?
**R**: NON, aucune obligation. La clause ne s'applique qu'aux modifications.

### Q: Nous avons corrigé un simple bug typo, doit-on publier?
**R**: OUI, toute modification, même mineure, doit être publiée.

### Q: Peut-on retarder la publication de 6 mois pour raisons stratégiques?
**R**: NON, 30 jours maximum. Pour un délai, contactez pour licence commerciale.

### Q: Notre fork peut-il avoir un nom différent?
**R**: OUI, mais vous devez clairement indiquer que c'est basé sur LLMUI Core.

### Q: Devons-nous publier nos données internes/configs?
**R**: NON, seulement le code source. Pas les données, configs sensibles, ou clés API.

### Q: Que se passe-t-il si on oublie et publie au jour 35?
**R**: Contactez immédiatement contact@llmui.org pour régulariser. La bonne foi compte.

### Q: Cette clause est-elle légalement valide?
**R**: OUI, c'est une condition d'utilisation additionnelle à l'AGPL v3, parfaitement légale.

### Q: Une université avec budget commercial est-elle exemptée?
**R**: OUI, les institutions académiques sont exemptées même si elles ont des budgets.

---

## 📊 Tableau récapitulatif

| Type d'entité | Employés | Revenus | Modifie | Publication obligatoire? |
|---------------|----------|---------|---------|--------------------------|
| Particulier | 1 | Non | Oui | ❌ NON |
| Étudiant | - | Non | Oui | ❌ NON |
| Freelance solo | 1 | Oui | Oui | ❌ NON |
| OBNL | 10 | Non lucratif | Oui | ❌ NON |
| Startup | 3 | Oui | Oui | ❌ NON (< 5) |
| Startup | 10 | Oui | Oui | ✅ OUI |
| PME | 50 | Oui | Oui | ✅ OUI |
| Grande entreprise | 1000+ | Oui | Oui | ✅ OUI |
| Entreprise | 10 | Oui | Non | ❌ NON (pas modifié) |

---

## 🎯 Cas d'usage typiques

### Cas 1: Startup tech (15 employés)

**Situation**: Utilise LLMUI, ajoute intégration avec leur API interne

**Obligations**:
1. ✅ Publier le code d'intégration sous 30 jours
2. ✅ Garder le dépôt public
3. ❌ Pas besoin de publier leur API privée (code non-LLMUI)

### Cas 2: Grande entreprise (500 employés)

**Situation**: Déploie LLMUI, modifie l'UI pour leur charte graphique

**Obligations**:
1. ✅ Publier toutes modifications UI sous 30 jours
2. ✅ Documenter les changements
3. ✅ Créditer François Chalut
4. ⚠️ Ne peuvent PAS garder ces modifications privées

### Cas 3: Consultant solo

**Situation**: Installe LLMUI chez un client, fait des modifications

**Obligations**:
1. ❌ Pas d'obligation (solo = exempté)
2. ✅ Mais si le CLIENT est une entreprise → Le client doit publier

### Cas 4: Université

**Situation**: Chercheurs modifient LLMUI pour projet recherche

**Obligations**:
1. ❌ Pas d'obligation immédiate (académique = exempté)
2. ✅ Encouragé à publier (science ouverte)
3. ✅ Doit publier si distribué ou utilisé via réseau

---

## 📧 Contact et clarifications

Si vous avez des doutes sur votre situation:

**François Chalut**
- Email: contact@llmui.org
- Web: https://llmui.org
- Tél: +1 (514) 443-2003

**Il vaut mieux demander que de risquer une violation!**

---

## 🔐 Résumé en une phrase

**Si vous êtes une entreprise (>5 employés OU revenus) et que vous modifiez LLMUI Core, vous DEVEZ publier votre code sur GitHub sous 30 jours, même pour usage interne uniquement.**

---

## ⚖️ Juridique

Cette clause est une condition d'utilisation additionnelle conforme à:
- Section 7 de la GNU GPL v3 (Additional Terms)
- Appliquée en complément de l'AGPL v3
- Soumise aux lois du Québec, Canada

---

**Dernière mise à jour**: 2025-11-21  
**Version de la licence**: AGPL v3 + Commons Clause + Clause Entreprise  
**Auteur**: François Chalut

*Pour la souveraineté numérique et l'open source équitable* 🇨🇦
