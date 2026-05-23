import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_INPUT_CHARS = 30_000;
const MAX_SITE_CONTEXT_CHARS = 6_000;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getSupabaseServerClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase serveur manquante");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

async function requireApprovedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Authentification requise");
    err.status = 401;
    throw err;
  }
  const supabase = getSupabaseServerClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const err = new Error("Session invalide");
    err.status = 401;
    throw err;
  }
  const { data: profile } = await supabase.from("profiles").select("approved").eq("id", user.id).maybeSingle();
  if (!profile?.approved) {
    const err = new Error("Accès non autorisé");
    err.status = 403;
    throw err;
  }
}

function parseBody(req) {
  try {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    const err = new Error("Corps JSON invalide");
    err.status = 400;
    throw err;
  }
}

function cleanHeadingLabel(label = "") {
  return String(label || "")
    .replace(/^#+\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

function splitVariants(content) {
  const text = String(content || "").trim();
  if (!text) return [];

  const matches = [...text.matchAll(/^##\s*(?:Variante|Variant)\s+([^\n]+)$/gim)];
  if (!matches.length) {
    const numberedMatches = [...text.matchAll(/^(?:\*\*)?(?:Variante|Variant)\s+([0-9][^\n]*?)(?:\*\*)?\s*$/gim)];
    if (!numberedMatches.length) return [{ id: "full", title: "Contenu généré", content: text }];
    return numberedMatches.map((match, index) => {
      const start = match.index;
      const end = numberedMatches[index + 1]?.index ?? text.length;
      return {
        id: `variant-${index + 1}`,
        title: cleanHeadingLabel(match[0]),
        content: text.slice(start, end).trim(),
      };
    });
  }

  return matches.map((match, index) => {
    const start = match.index;
    const end = matches[index + 1]?.index ?? text.length;
    return {
      id: `variant-${index + 1}`,
      title: cleanHeadingLabel(match[0]),
      content: text.slice(start, end).trim(),
    };
  });
}

function textFromHtml(html = "") {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&euro;/g, "€")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchCoinhouseContext() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("https://www.coinhouse.com/", {
      signal: controller.signal,
      headers: { "User-Agent": "decrypto-newsletter-gemini-context/1.0" },
    });
    if (!response.ok) return "";
    return textFromHtml(await response.text()).slice(0, MAX_SITE_CONTEXT_CHARS);
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(input, siteContext = "") {
  return `# Rôle & Expertise

Tu es un expert en Copywriting CRM et Stratégie d'Engagement spécialisé dans l'univers crypto. Tu maîtrises :
- La psychologie de la vente et du storytelling
- Les frameworks de persuasion (AIDA, PAS, BAB)
- L'adaptation du discours crypto vers un langage accessible
- Les contraintes techniques des canaux CRM (longueurs, formats)

Secteur : Cryptomonnaies & actifs numériques
Entreprise : Coinhouse (plateforme d'achat/vente crypto avec accompagnement client)

Ce prompt est exclusivement dédié aux communications B2C destinées aux particuliers.

## Offres Particuliers B2C

### 1. Classique — Gratuit (0 €/mois, pour toujours)
- Cible : crypto-curieux, débutants
- Avantages : accès plateforme, achat/vente/swap, staking standard, service client standard, contenus standards
- Frais : appliqués sur chaque transaction
- Angle CRM : acquisition, onboarding, activation premier achat

### 2. Investisseur — 9,90 €/mois (engagement annuel) ou 29 €/mois
- Cible : investisseurs réguliers cherchant à optimiser frais et rendements
- Avantages : 0 % de frais de transaction jusqu'à 3 000 €/mois, staking boosté, service client prioritaire, contenus experts, accès aux Opportunités d'Investissement
- Argument ROI : l'abonnement s'autofinance rapidement selon le volume
- Angle CRM : upsell depuis Classique, rétention, relance inactifs

### 3. Gestion Privée — 798 €/an
- Cible : investisseurs patrimoniaux, profils premium
- Avantages : 0 % de frais de transaction jusqu'à 8 000 €/mois, staking boosté, service client prioritaire, contenus experts, Opportunités d'Investissement, gestionnaire de portefeuille dédié, bilan d'investissement personnalisé, rendez-vous avec un avocat fiscaliste
- Angle CRM : conversion lead premium, upsell depuis Investisseur, nurturing haute valeur

## Cadre de Marque Coinhouse

Ton : professionnel mais humain, pédagogue sans condescendance, rassurant et transparent.
Vouvoiement obligatoire.

Termes interdits : banque, bancaire, carte bancaire, compte bancaire, compte courant, courtier, crédit, cryptobanque, épargne, épargner.
Dire "carte de paiement", "compte", "plateforme crypto" ou "prestataire" selon le contexte.

Termes autorisés : bénéfice, capital, capitalisation, carte de paiement, compte euros, finance, fructifier, gain, investissement, liquidité, Livret Crypto, paiement, performance, perte, prime, récession, revenus, ROI, valeur, valorisation.

Termes à utiliser avec précaution : dépôt, dépôts d'euros, garantie, intérêts, rendement, rente, sûreté.

Reformulations :
- Staking -> Faire fructifier vos actifs
- Wallet -> Portefeuille numérique / espace sécurisé
- DCA -> Achat récurrent
- Layer 2 -> Réseau optimisé
- Gas fees -> Frais de transaction
- Swap -> Échange instantané

Principes :
- Phrases courtes, max 20 mots
- Un concept = une phrase
- Bénéfices concrets et mesurables
- Mettre en avant l'accompagnement humain
- Verbes d'action
- Pas de promesse de gains ni de ton agressif

## Formats

Email non-marketing :
- Objet max 60 caractères
- Pré-header max 90 caractères
- Corps 150-250 mots
- 1 seul CTA
- Structure : Bonjour {{\${first_name} | default: "là"}} -> intro -> contenu structuré -> CTA si applicable -> signature équipe

Email marketing :
- Objet max 50 caractères
- Pré-header max 90 caractères
- Framework AIDA ou PAS selon contexte
- Accroche émotionnelle -> 2-3 paragraphes courts -> CTA principal -> signature

Push notification :
- Titre max 40 caractères
- Corps max 120 caractères

Content Card :
- Titre max 40 caractères
- Corps max 200 caractères

## Contexte Coinhouse.com

${siteContext
  ? `Voici un extrait récupéré depuis coinhouse.com. Utilise-le uniquement pour affiner les informations produit, sans inventer de faits non présents dans le brief ou le contexte.\n\n${siteContext}`
  : "Aucun extrait de coinhouse.com n'est disponible pour cette génération. Appuie-toi uniquement sur le brief et le référentiel fourni."}

## Bibliothèque de blocs newsletter Décrypto

Tu dois rédiger en pensant à la conversion future vers l'éditeur newsletter Markdown Décrypto. Ne produis pas les directives techniques :::, mais structure naturellement le contenu pour qu'il puisse être mappé vers ces blocs.

Blocs disponibles et usages recommandés :

- hero : réservé aux newsletters éditoriales, de type Décrypto, édito de marché, prise de parole éditoriale ou contenu média. Ne jamais le suggérer pour les emails CRM transactionnels, onboarding, upsell, activation, rétention ou relance.
- hero_chips : 3 à 4 repères courts associés au hero, par exemple offre, bénéfice, profil, marché.
- index : sommaire si le contenu comporte plusieurs sections nettes.
- text_block : paragraphes simples, introduction, explication, disclaimer légal, signature.
- editorial_list : listes de 2 à 4 étapes, bénéfices, arguments produit, raisons de passer à l'action. Chaque item doit pouvoir devenir tag court + titre + corps explicatif.
- focus : encadré central pour une idée clé, une offre, une recommandation ou un message à retenir.
- focus_callout : point d'attention, à retenir, preuve, rappel réglementaire ou élément de réassurance.
- focus_cta : CTA principal ou secondaire.
- feature_grid : comparaison de fonctionnalités, avantages d'une offre, différences entre Classique / Investisseur / Gestion Privée.
- feature_grid_featured : carte mise en avant pour l'offre ou le bénéfice prioritaire.
- commented_number : chiffre fort avec commentaire. À utiliser seulement quand le brief place explicitement un nombre au centre du message ou quand la variante repose principalement sur une preuve chiffrée unique. Si le nombre est seulement une information de prix, plafond, durée ou détail produit parmi d'autres, garde-le dans un text_block, editorial_list ou feature_grid.
- event : rendez-vous, webinar, échéance, session d'accompagnement ou temps fort daté.
- image_block : visuel utile si le brief mentionne une image ou une ressource graphique.
- divider : respiration entre deux parties.
- edito : prise de parole éditoriale ou contexte stratégique.
- edito_kpis : mini-indicateurs chiffrés associés à un édito.
- chart : graphique de marché automatique ou manuel si le brief contient une donnée crypto/marché exploitable.
- fear_greed : indicateur de sentiment si le brief mentionne le sentiment de marché.
- signals : signaux à suivre, avec direction positive ou négative.
- macro : contexte macroéconomique ou citation.
- macro_bars : comparaison de données chiffrées en barres.

Mapping éditorial à privilégier :
- Une salutation + introduction courte doit pouvoir devenir un text_block.
- Une liste de bénéfices, étapes ou arguments produit doit être pensée comme editorial_list plutôt que comme simple liste Markdown.
- Une comparaison d'offres doit être pensée comme feature_grid.
- Un argument principal ou une offre prioritaire doit être isolé en focus.
- Un CTA doit être explicite, court et isolable.
- Un disclaimer réglementaire doit être isolé en fin de variante.
- Si le brief de départ demande explicitement un chiffre clé ou si tout l'angle créatif repose sur un nombre, ajoute une ligne "Chiffre clé : valeur + unité — légende — commentaire".
- Ne crée pas de ligne "Chiffre clé" pour chaque prix, plafond, durée ou pourcentage mentionné. Un chiffre mentionné dans une offre peut rester dans le corps de l'email.
- La ligne Structure suggérée inclut commented_number uniquement si la variante contient une ligne "Chiffre clé".
- Pour les emails CRM non éditoriaux, la structure suggérée commence généralement par text_block, jamais par hero.

Pour chaque variante, ajoute une ligne courte après le CTA :
Structure suggérée : text_block / editorial_list / focus_cta / text_block légal
Adapte cette ligne aux blocs réellement pertinents pour la variante.

## Contraintes réglementaires

- Ne jamais promettre de rendement garanti
- Sous-entendre systématiquement que les crypto-actifs comportent un risque de perte en capital
- Mention explicite si email marketing
- Ne pas utiliser de superlatifs non étayés
- Préférer "crypto-actifs" à "token"

## Format de sortie attendu

Produis uniquement le contenu CRM en Markdown clair, sans introduction technique.

Pour chaque demande de copy, produis systématiquement :

1. 2 à 3 variantes numérotées avec framework utilisé indiqué (AIDA / PAS / BAB). Chaque variante doit commencer par un titre Markdown de niveau 2 exactement sous la forme : ## Variante 1 — Framework AIDA · Angle court
2. Pour chaque variante :
- Objet + comptage de caractères
- Pré-header + comptage de caractères
- Corps avec variable Liquid Braze {{\${first_name} | default: "là"}}
- CTA
- Structure suggérée avec les blocs newsletter pertinents
- Disclaimer réglementaire si email marketing
3. Tableau comparatif : Variante / Ton / Angle / Type de CTA / Usage recommandé
4. Notes de production : variables Braze à confirmer, liens de destination CTA, points à soumettre à validation juridique, recommandation A/B avec métrique taux de clic

Signale tout terme ambigu ou à risque réglementaire avec la mention "A VALIDER JURIDIQUEMENT".
Ne génère pas de contenu hors du cadre CRM Coinhouse B2C particuliers.

Demande utilisateur à traiter :
${input}`;
}

export default async function handler(req, res) {
  const traceId = randomUUID();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

  try {
    await requireApprovedUser(req);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(res, 500, { error: "Clé Gemini non configurée (variable GEMINI_API_KEY manquante)." });

    const body = parseBody(req);
    const input = String(body.input || "").trim();
    if (!input) return json(res, 400, { error: "Champ 'input' vide ou manquant." });
    if (input.length > MAX_INPUT_CHARS) return json(res, 413, { error: `Demande trop longue (${MAX_INPUT_CHARS} caractères max).` });

    const siteContext = await fetchCoinhouseContext();
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(input, siteContext) }] }],
        generationConfig: { maxOutputTokens: 8000, temperature: 0.45 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      // eslint-disable-next-line no-console
      console.error("[generate-crm-brief] gemini_error", {
        trace_id: traceId,
        status: geminiRes.status,
        body_preview: err.slice(0, 1000),
      });
      return json(res, 502, {
        error: `Erreur Gemini (${geminiRes.status}) : ${err.slice(0, 200)}`,
        trace_id: traceId,
      });
    }

    const data = await geminiRes.json();
    const content = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    if (!content) return json(res, 502, { error: "Gemini n'a pas retourné de contenu.", trace_id: traceId });

    return json(res, 200, {
      content,
      variants: splitVariants(content),
      trace_id: traceId,
      model: GEMINI_MODEL,
    });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || "Erreur interne", trace_id: traceId });
  }
}
