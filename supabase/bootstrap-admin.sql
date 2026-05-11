-- ─────────────────────────────────────────────────────────────────────────────
-- Bootstrap : promouvoir le premier user admin
-- ─────────────────────────────────────────────────────────────────────────────
-- À exécuter UNE FOIS après la création du tout premier compte.
-- Remplace l'email par le tien.

update public.profiles
   set approved = true,
       is_admin = true
 where email = 'TON-EMAIL@coinhouse.com';
