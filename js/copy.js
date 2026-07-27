const MANGROVE_COPY_CACHE_KEY = 'mangrove-villas-copy-cache';
const MANGROVE_COPY_CACHE_TTL = 5 * 60 * 1000;

const MANGROVE_COPY_DEFAULTS = {
    hero_eyebrow: 'Gibson Bight · Roatán, Honduras',
    hero_title: 'Mangrove Villas',
    hero_subtitle: 'A quiet place to land between reef, rainforest, and the Caribbean sea.',
    hero_scroll: 'Discover the villas',
    about_kicker: 'Slow mornings, salt air',
    about_title: 'A hidden gem in Roatán',
    about_text: 'Nestled oceanside in a protected bay, Mangrove Villas offers an easygoing escape with the island close at hand. We are about 20 minutes from the airport, a 25-minute walk or 5-minute drive from the vibrant West End dive scene, and 10 minutes from West Bay Beach.',
    about_cta: 'Explore the rooms',
    about_secondary_cta: 'Plan your stay',
    rooms_kicker: 'Choose your view',
    rooms_title: 'Three ways to stay',
    rates_note: 'Rates may vary seasonally. Electricity is additional for all rooms.',
    room1_floor: 'First floor · Mangrove view',
    room1_title: 'Queen Bed Studio',
    room1_description: 'A comfortable, self-contained studio with a private balcony and everything needed for an easy island stay.',
    room1_amenities: 'Kitchenette · AC · TV · Parking',
    room1_price: '$80',
    room1_rate_suffix: '/ night + electricity',
    room1_cta: 'View Room 1',
    room2_floor: 'Second floor · Ocean view',
    room2_title: '2 Bedroom Unit',
    room2_description: 'A spacious family-friendly home base with a pullout couch in the family room and a full kitchen.',
    room2_amenities: '2 bedrooms · AC · Balcony · Parking',
    room2_price: '$130',
    room2_rate_suffix: '/ night + electricity',
    room2_cta: 'View Room 2',
    room3_floor: 'Third floor · Ocean view',
    room3_title: 'King Bed Studio',
    room3_description: 'An airy top-floor studio with a walk-in closet, full kitchen, and a wrap-around balcony.',
    room3_amenities: 'King bed · Full kitchen · AC · Wrap balcony',
    room3_price: '$120',
    room3_rate_suffix: '/ night + electricity',
    room3_cta: 'View Room 3',
    dive_kicker: 'Right next door',
    dive_title: 'Make the reef part of your stay',
    dive_text: 'Mangrove Villas is located beside the highly-rated Octopus Dive School. From first bubbles to advanced reef dives, our guests are perfectly placed to get in the water.',
    dive_quote: '“Best dive experience of my life. The crew was professional and the reef is breathtaking.”',
    dive_cta: 'Ask about dive packages',
    attractions_kicker: 'Close to everything',
    attractions_title: 'The island, at your pace',
    attraction_west_end: 'West End · famous dive destination',
    attraction_west_end_time: '25 min walk · 5 min drive',
    attraction_west_bay: 'West Bay Beach',
    attraction_west_bay_time: '10 min drive',
    attraction_airport: 'Roatán International Airport',
    attraction_airport_time: '20 min drive',
    attraction_gumbalimba: 'Gumbalimba Park',
    attraction_gumbalimba_time: '15 min drive',
    attraction_sandy_bay: 'Sandy Bay Marine Park',
    attraction_sandy_bay_time: '5 min drive',
    contact_kicker: 'Start a conversation',
    contact_title: 'Come find your corner of the island.',
    contact_address: 'Mangrove Villas · Gibson Bight Road, Roatán',
    contact_email: 'bennyabel@hotmail.com',
    contact_whatsapp: 'WhatsApp · +1 320-267-9737',
    contact_cta: 'Email to plan your stay',
    footer_brand: 'Mangrove Villas · Gibson Bight, Roatán',
    footer_rights: 'All rights reserved.',
    room1_hero_kicker: 'Room 01 · First floor',
    room1_hero_description: 'A calm, self-contained studio for couples or solo travelers, with a private balcony, mangrove views, and the comforts of home.',
    room1_meta_1: 'Mangrove view',
    room1_meta_2: 'Private balcony',
    room1_meta_3: 'Kitchenette',
    room1_detail_kicker: 'Settle in',
    room1_detail_title: 'Everything you need for an easy island stay.',
    room1_amenity_1: 'Queen bed',
    room1_amenity_2: 'Fully equipped kitchenette',
    room1_amenity_3: 'Air conditioning',
    room1_amenity_4: 'Private balcony',
    room1_amenity_5: 'TV',
    room1_amenity_6: 'Fans',
    room1_amenity_7: 'Parking',
    room1_amenity_8: 'Mangrove view',
    room1_amenity_9: 'Coffee',
    room1_amenity_10: 'Microwave',
    room1_rate_kicker: 'Room 1 rate',
    room1_rate_note: 'Price may vary seasonally. Electricity is additional. Email us to talk through dates, dive plans, and the best fit for your stay.',
    room1_rate_cta: 'Email about Room 1',
    room2_hero_kicker: 'Room 02 · Second floor',
    room2_hero_description: 'A spacious family-friendly unit with a pullout couch in the family room, a private balcony, and the freedom of a fully stocked kitchen.',
    room2_meta_1: 'Ocean view',
    room2_meta_2: '2 bedrooms',
    room2_meta_3: 'Pullout couch',
    room2_detail_kicker: 'Make room for everyone',
    room2_detail_title: 'A relaxed home base for family and friends.',
    room2_amenity_1: '2 bedrooms',
    room2_amenity_2: 'Pullout couch in family room',
    room2_amenity_3: 'Air conditioning',
    room2_amenity_4: 'Private balcony',
    room2_amenity_5: 'TV',
    room2_amenity_6: 'Fans',
    room2_amenity_7: 'Parking',
    room2_amenity_8: 'Ocean view',
    room2_amenity_9: 'Fully stocked kitchen',
    room2_amenity_10: 'Coffee',
    room2_amenity_11: 'Microwave',
    room2_rate_kicker: 'Room 2 rate',
    room2_rate_note: 'Price may vary seasonally. Electricity is additional. Email us to talk through dates, dive plans, and the best fit for your stay.',
    room2_rate_cta: 'Email about Room 2',
    room3_hero_kicker: 'Room 03 · Third floor',
    room3_hero_description: 'Our top-floor studio pairs a king bed with a walk-in closet, full kitchen, and wrap-around balcony made for taking in the ocean air.',
    room3_meta_1: 'Ocean view',
    room3_meta_2: 'Wrap-around balcony',
    room3_meta_3: 'Walk-in closet',
    room3_detail_kicker: 'Take in the view',
    room3_detail_title: 'Top-floor ease with room to breathe.',
    room3_amenity_1: 'King bed',
    room3_amenity_2: 'Walk-in closet',
    room3_amenity_3: 'Full kitchen',
    room3_amenity_4: 'Wrap-around balcony',
    room3_amenity_5: 'Ocean view',
    room3_amenity_6: 'Air conditioning',
    room3_amenity_7: 'TV',
    room3_amenity_8: 'Ceiling fans',
    room3_amenity_9: 'Fully stocked kitchen',
    room3_amenity_10: 'Coffee',
    room3_amenity_11: 'Microwave',
    room3_rate_kicker: 'Room 3 rate',
    room3_rate_note: 'Price may vary seasonally. Electricity is additional. Email us to talk through dates, dive plans, and the best fit for your stay.',
    room3_rate_cta: 'Email about Room 3'
};

let mangroveCopyLoadRequest = null;
let mangroveCopySaveRequest = null;
let mangroveCopyLastSource = 'local defaults';

function readMangroveCopyCache(ignoreAge = false) {
    try {
        const cached = JSON.parse(localStorage.getItem(MANGROVE_COPY_CACHE_KEY) || 'null');
        if (!cached || !cached.copy || (!ignoreAge && Date.now() - cached.savedAt > MANGROVE_COPY_CACHE_TTL)) return null;
        return { ...MANGROVE_COPY_DEFAULTS, ...cached.copy };
    } catch {
        return null;
    }
}

function writeMangroveCopyCache(copy) {
    try {
        localStorage.setItem(MANGROVE_COPY_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), copy }));
    } catch {
        // Storage can be unavailable in private browsing; network copy still works.
    }
}

async function loadMangroveCopy({ force = false } = {}) {
    if (!force) {
        const cached = readMangroveCopyCache();
        if (cached) return cached;
    }
    if (mangroveCopyLoadRequest) return mangroveCopyLoadRequest;

    mangroveCopyLoadRequest = (async () => {
        try {
            const client = window.MangroveSupabase?.client;
            if (!client) throw new Error('Supabase client is unavailable.');
            const { data, error } = await client
                .from('site_content')
                .select('content_value, updated_at')
                .eq('site_key', window.MangroveSupabase.siteKey)
                .eq('content_key', window.MangroveSupabase.contentKey)
                .eq('is_published', true)
                .maybeSingle();
            if (error) throw error;
            const remoteCopy = data?.content_value && typeof data.content_value === 'object' ? data.content_value : {};
            const copy = { ...MANGROVE_COPY_DEFAULTS, ...remoteCopy };
            writeMangroveCopyCache(copy);
            mangroveCopyLastSource = data ? 'Supabase' : 'local defaults';
            return copy;
        } catch (error) {
            console.warn('Supabase copy unavailable; using local copy.', error);
            mangroveCopyLastSource = 'local defaults';
            return readMangroveCopyCache(true) || { ...MANGROVE_COPY_DEFAULTS };
        } finally {
            mangroveCopyLoadRequest = null;
        }
    })();

    return mangroveCopyLoadRequest;
}

function applyMangroveCopy(copy) {
    document.querySelectorAll('[data-copy]').forEach(element => {
        const key = element.dataset.copy;
        if (!Object.prototype.hasOwnProperty.call(copy, key)) return;
        const linkText = element.dataset.copyLinkText;
        if (!linkText) {
            element.textContent = copy[key];
            return;
        }

        const value = String(copy[key]);
        const linkIndex = value.indexOf(linkText);
        if (linkIndex === -1) {
            element.textContent = value;
            return;
        }
        element.replaceChildren(
            document.createTextNode(value.slice(0, linkIndex)),
            Object.assign(document.createElement('a'), {
                className: 'inline-link',
                href: 'https://roatan-octopusdiveschool.com',
                target: '_blank',
                rel: 'noopener',
                textContent: linkText
            }),
            document.createTextNode(value.slice(linkIndex + linkText.length))
        );
    });
    document.querySelectorAll('[data-copy-placeholder]').forEach(element => {
        const key = element.dataset.copyPlaceholder;
        if (Object.prototype.hasOwnProperty.call(copy, key)) element.placeholder = copy[key];
    });
}

async function sendMangroveCopyToSupabase(nextCopy) {
    const client = window.MangroveSupabase?.client;
    if (!client) throw new Error('Supabase client is unavailable.');
    const { error } = await client
        .from('site_content')
        .upsert({
            site_key: window.MangroveSupabase.siteKey,
            content_key: window.MangroveSupabase.contentKey,
            content_value: nextCopy,
            content_type: 'json',
            is_published: true,
            metadata: { source: 'mangrove-villas-copy-editor' }
        }, { onConflict: 'site_key,content_key' });
    if (error) throw error;
    writeMangroveCopyCache(nextCopy);
    mangroveCopyLastSource = 'Supabase';
    return { ...nextCopy, supabaseSaved: true };
}

window.MangroveCopy = {
    defaults: MANGROVE_COPY_DEFAULTS,
    source: () => mangroveCopyLastSource,
    load: loadMangroveCopy,
    apply: applyMangroveCopy,
    async save(copy) {
        const nextCopy = { ...MANGROVE_COPY_DEFAULTS, ...copy };
        if (mangroveCopySaveRequest) return mangroveCopySaveRequest;
        mangroveCopySaveRequest = sendMangroveCopyToSupabase(nextCopy).finally(() => {
            mangroveCopySaveRequest = null;
        });
        return mangroveCopySaveRequest;
    }
};

window.addEventListener('storage', event => {
    if (event.key !== MANGROVE_COPY_CACHE_KEY || !event.newValue) return;
    const cached = readMangroveCopyCache(true);
    if (cached) applyMangroveCopy(cached);
});
