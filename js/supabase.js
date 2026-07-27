const MANGROVE_SUPABASE_URL = 'https://tzkdjxfavukfbeewvsld.supabase.co';
const MANGROVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qq1u53RA80ywZF95OcWg6w_wRjQ9Mwx';
const MANGROVE_SUPABASE_SITE_KEY = 'mangrove-villas';
const MANGROVE_SUPABASE_CONTENT_KEY = 'copy';

let mangroveSupabaseClient = null;

if (window.supabase?.createClient) {
    mangroveSupabaseClient = window.supabase.createClient(
        MANGROVE_SUPABASE_URL,
        MANGROVE_SUPABASE_PUBLISHABLE_KEY
    );
}

window.MangroveSupabase = {
    client: mangroveSupabaseClient,
    url: MANGROVE_SUPABASE_URL,
    siteKey: MANGROVE_SUPABASE_SITE_KEY,
    contentKey: MANGROVE_SUPABASE_CONTENT_KEY
};
