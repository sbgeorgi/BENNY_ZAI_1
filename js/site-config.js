/* Mangrove Villas — site editor configuration (shared roatandesign backend, site_key mangrove-villas).
 * The defaults below are the built-in fallback and define which fields are editable. */
window.SiteEditorConfig = {
    "supabaseUrl": "https://scxlifvmaxzallqcbzwg.supabase.co",
    "publishableKey": "sb_publishable_A9oxN1sULg0Xiy6EhGSAAw_Zu4QpSRd",
    "siteKey": "mangrove-villas",
    "siteName": "Mangrove Villas",
    "brandMark": "M",
    "languages": [
        "en"
    ],
    "pages": [
        [
            "index.html",
            "Home"
        ],
        [
            "room1.html",
            "Room 1 · Queen Bed Studio"
        ],
        [
            "room2.html",
            "Room 2 · 2 Bedroom Unit"
        ],
        [
            "room3.html",
            "Room 3 · King Bed Studio"
        ]
    ],
    "settingsFields": [
        {
            "key": "email",
            "label": "Booking email",
            "type": "email",
            "maxLength": 254,
            "help": "Shown on the site and used by every email button."
        },
        {
            "key": "whatsapp",
            "label": "WhatsApp number",
            "type": "digits",
            "maxLength": 15,
            "help": "Digits only, with country code (e.g. 13202679737). Updates every WhatsApp button."
        },
        {
            "key": "instagramUrl",
            "label": "Instagram link",
            "type": "url",
            "maxLength": 2048
        },
        {
            "key": "facebookUrl",
            "label": "Facebook link",
            "type": "url",
            "maxLength": 2048
        }
    ],
    "defaults": {
        "copy": {
            "en": {
                "hero_eyebrow": "Gibson Bight · Roatán, Honduras",
                "hero_title": "Mangrove Villas",
                "hero_subtitle": "A quiet place to land between reef, rainforest, and the Caribbean sea.",
                "hero_scroll": "Discover the villas",
                "about_kicker": "Slow mornings, salt air",
                "about_title": "A hidden gem in Roatán",
                "about_text": "Nestled oceanside in a protected bay, Mangrove Villas offers an easygoing escape with the island close at hand. We are about 20 minutes from the airport, a 25-minute walk or 5-minute drive from the vibrant West End dive scene, and 10 minutes from West Bay Beach.",
                "about_cta": "Explore the rooms",
                "about_secondary_cta": "Plan your stay",
                "rooms_kicker": "Choose your view",
                "rooms_title": "Three ways to stay",
                "rates_note": "Rates may vary seasonally. Electricity is additional for all rooms.",
                "shared_laundry": "Free shared laundry",
                "shared_drinking_water": "Drinking water provided",
                "room1_floor": "First floor · Mangrove view",
                "room1_title": "Queen Bed Studio",
                "room1_description": "A comfortable, self-contained studio with a private balcony and everything needed for an easy island stay.",
                "room1_amenities": "Kitchenette · AC · TV · Parking",
                "room1_price": "$80",
                "room1_rate_suffix": "/ night + electricity",
                "room1_cta": "View Room 1",
                "room2_floor": "Second floor · Ocean view",
                "room2_title": "2 Bedroom Unit",
                "room2_description": "A spacious family-friendly home base with a pullout couch in the family room and a full kitchen.",
                "room2_amenities": "2 bedrooms · AC · Balcony · Parking",
                "room2_price": "$130",
                "room2_rate_suffix": "/ night + electricity",
                "room2_cta": "View Room 2",
                "room3_floor": "Third floor · Ocean view",
                "room3_title": "King Bed Studio",
                "room3_description": "An airy top-floor studio with a walk-in closet, full kitchen, and a wrap-around balcony.",
                "room3_amenities": "King bed · Full kitchen · AC · Wrap balcony",
                "room3_price": "$120",
                "room3_rate_suffix": "/ night + electricity",
                "room3_cta": "View Room 3",
                "dive_kicker": "Right next door",
                "dive_title": "Make the reef part of your stay",
                "dive_text": "Mangrove Villas is located beside the highly-rated Octopus Dive School. From first bubbles to advanced reef dives, our guests are perfectly placed to get in the water.",
                "dive_quote": "“Best dive experience of my life. The crew was professional and the reef is breathtaking.”",
                "attractions_kicker": "Close to everything",
                "attractions_title": "The island, at your pace",
                "attraction_west_end": "West End · famous dive destination",
                "attraction_west_end_time": "25 min walk · 5 min drive",
                "attraction_west_bay": "West Bay Beach",
                "attraction_west_bay_time": "10 min drive",
                "attraction_airport": "Roatán International Airport",
                "attraction_airport_time": "20 min drive",
                "attraction_gumbalimba": "Gumbalimba Park",
                "attraction_gumbalimba_time": "15 min drive",
                "attraction_sandy_bay": "Sandy Bay Marine Park",
                "attraction_sandy_bay_time": "5 min drive",
                "contact_kicker": "Start a conversation",
                "contact_title": "Come find your corner of the island.",
                "contact_address": "Mangrove Villas · Gibson Bight Road, Roatán",
                "contact_whatsapp": "WhatsApp · +1 320-267-9737",
                "contact_cta": "Email to plan your stay",
                "footer_brand": "Mangrove Villas · Gibson Bight, Roatán",
                "footer_rights": "All rights reserved.",
                "room1_hero_kicker": "Room 01 · First floor",
                "room1_hero_description": "A calm, self-contained studio for couples or solo travelers, with a private balcony, mangrove views, and the comforts of home.",
                "room1_meta_1": "Mangrove view",
                "room1_meta_2": "Private balcony",
                "room1_meta_3": "Kitchenette",
                "room1_detail_kicker": "Settle in",
                "room1_detail_title": "Everything you need for an easy island stay.",
                "room1_amenity_1": "Queen bed",
                "room1_amenity_2": "Fully equipped kitchenette",
                "room1_amenity_3": "Air conditioning",
                "room1_amenity_4": "Private balcony",
                "room1_amenity_5": "TV",
                "room1_amenity_6": "Fans",
                "room1_amenity_7": "Parking",
                "room1_amenity_8": "Mangrove view",
                "room1_amenity_9": "Coffee",
                "room1_amenity_10": "Microwave",
                "room1_rate_kicker": "Room 1 rate",
                "room1_rate_note": "Price may vary seasonally. Electricity is additional. Email us to talk through dates, dive plans, and the best fit for your stay.",
                "room1_rate_cta": "Email about Room 1",
                "room2_hero_kicker": "Room 02 · Second floor",
                "room2_hero_description": "A spacious family-friendly unit with a pullout couch in the family room, a private balcony, and the freedom of a fully stocked kitchen.",
                "room2_meta_1": "Ocean view",
                "room2_meta_2": "2 bedrooms",
                "room2_meta_3": "Pullout couch",
                "room2_detail_kicker": "Make room for everyone",
                "room2_detail_title": "A relaxed home base for family and friends.",
                "room2_amenity_1": "2 bedrooms",
                "room2_amenity_2": "Pullout couch in family room",
                "room2_amenity_3": "Air conditioning",
                "room2_amenity_4": "Private balcony",
                "room2_amenity_5": "TV",
                "room2_amenity_6": "Fans",
                "room2_amenity_7": "Parking",
                "room2_amenity_8": "Ocean view",
                "room2_amenity_9": "Fully stocked kitchen",
                "room2_amenity_10": "Coffee",
                "room2_amenity_11": "Microwave",
                "room2_rate_kicker": "Room 2 rate",
                "room2_rate_note": "Price may vary seasonally. Electricity is additional. Email us to talk through dates, dive plans, and the best fit for your stay.",
                "room2_rate_cta": "Email about Room 2",
                "room3_hero_kicker": "Room 03 · Third floor",
                "room3_hero_description": "Our top-floor studio pairs a king bed with a walk-in closet, full kitchen, and wrap-around balcony made for taking in the ocean air.",
                "room3_meta_1": "Ocean view",
                "room3_meta_2": "Wrap-around balcony",
                "room3_meta_3": "Walk-in closet",
                "room3_detail_kicker": "Take in the view",
                "room3_detail_title": "Top-floor ease with room to breathe.",
                "room3_amenity_1": "King bed",
                "room3_amenity_2": "Walk-in closet",
                "room3_amenity_3": "Full kitchen",
                "room3_amenity_4": "Wrap-around balcony",
                "room3_amenity_5": "Ocean view",
                "room3_amenity_6": "Air conditioning",
                "room3_amenity_7": "TV",
                "room3_amenity_8": "Ceiling fans",
                "room3_amenity_9": "Fully stocked kitchen",
                "room3_amenity_10": "Coffee",
                "room3_amenity_11": "Microwave",
                "room3_rate_kicker": "Room 3 rate",
                "room3_rate_note": "Price may vary seasonally. Electricity is additional. Email us to talk through dates, dive plans, and the best fit for your stay.",
                "room3_rate_cta": "Email about Room 3",
                "about_image_caption": "Half Moon Bay · Roatán",
                "room_footer_location": "Mangrove Villas · Gibson Bight, Roatán"
            }
        },
        "media": {
            "images": {
                "hero": "images/h1.jpeg",
                "about": "images/halfmoon.jpg",
                "room1Card": "images/ROOM%201/1.jpeg",
                "room2Card": "images/ROOM%202/3.jpeg",
                "room3Card": "images/ROOM%203/1.jpeg",
                "dive": "images/OCTOPUS.jpg"
            },
            "videos": {},
            "references": {}
        },
        "settings": {
            "email": "bennyabel@hotmail.com",
            "whatsapp": "13202679737",
            "instagramUrl": "https://www.instagram.com/",
            "facebookUrl": "https://www.facebook.com/"
        }
    },
    "mediaLibrary": [
        {
            "name": "h1.jpeg",
            "url": "images/h1.jpeg"
        },
        {
            "name": "halfmoon.jpg",
            "url": "images/halfmoon.jpg"
        },
        {
            "name": "OCTOPUS.jpg",
            "url": "images/OCTOPUS.jpg"
        },
        {
            "name": "Room 1 · 1.jpeg",
            "url": "images/ROOM%201/1.jpeg"
        },
        {
            "name": "Room 1 · 2.jpeg",
            "url": "images/ROOM%201/2.jpeg"
        },
        {
            "name": "Room 1 · 3.jpeg",
            "url": "images/ROOM%201/3.jpeg"
        },
        {
            "name": "Room 1 · 4.jpeg",
            "url": "images/ROOM%201/4.jpeg"
        },
        {
            "name": "Room 1 · 5.jpeg",
            "url": "images/ROOM%201/5.jpeg"
        },
        {
            "name": "Room 1 · 6.jpeg",
            "url": "images/ROOM%201/6.jpeg"
        },
        {
            "name": "Room 1 · 7.jpeg",
            "url": "images/ROOM%201/7.jpeg"
        },
        {
            "name": "Room 1 · 8.jpeg",
            "url": "images/ROOM%201/8.jpeg"
        },
        {
            "name": "Room 1 · 9.jpeg",
            "url": "images/ROOM%201/9.jpeg"
        },
        {
            "name": "Room 2 · 2.jpeg",
            "url": "images/ROOM%202/2.jpeg"
        },
        {
            "name": "Room 2 · 3.jpeg",
            "url": "images/ROOM%202/3.jpeg"
        },
        {
            "name": "Room 2 · 4.jpeg",
            "url": "images/ROOM%202/4.jpeg"
        },
        {
            "name": "Room 2 · 5.jpeg",
            "url": "images/ROOM%202/5.jpeg"
        },
        {
            "name": "Room 2 · 6.jpeg",
            "url": "images/ROOM%202/6.jpeg"
        },
        {
            "name": "Room 2 · 7.jpeg",
            "url": "images/ROOM%202/7.jpeg"
        },
        {
            "name": "Room 2 · 8.jpeg",
            "url": "images/ROOM%202/8.jpeg"
        },
        {
            "name": "Room 2 · 9.jpeg",
            "url": "images/ROOM%202/9.jpeg"
        },
        {
            "name": "Room 2 · 10.jpeg",
            "url": "images/ROOM%202/10.jpeg"
        },
        {
            "name": "Room 2 · 11.jpeg",
            "url": "images/ROOM%202/11.jpeg"
        },
        {
            "name": "Room 2 · 12.jpeg",
            "url": "images/ROOM%202/12.jpeg"
        },
        {
            "name": "Room 2 · 13.jpeg",
            "url": "images/ROOM%202/13.jpeg"
        },
        {
            "name": "Room 2 · 14.jpeg",
            "url": "images/ROOM%202/14.jpeg"
        },
        {
            "name": "Room 2 · 15.jpeg",
            "url": "images/ROOM%202/15.jpeg"
        },
        {
            "name": "Room 2 · 16.jpeg",
            "url": "images/ROOM%202/16.jpeg"
        },
        {
            "name": "Room 2 · 17.jpeg",
            "url": "images/ROOM%202/17.jpeg"
        },
        {
            "name": "Room 2 · 18.jpeg",
            "url": "images/ROOM%202/18.jpeg"
        },
        {
            "name": "Room 2 · 19.jpeg",
            "url": "images/ROOM%202/19.jpeg"
        },
        {
            "name": "Room 3 · 1.jpeg",
            "url": "images/ROOM%203/1.jpeg"
        },
        {
            "name": "Room 3 · 2.jpeg",
            "url": "images/ROOM%203/2.jpeg"
        },
        {
            "name": "Room 3 · 3.jpeg",
            "url": "images/ROOM%203/3.jpeg"
        },
        {
            "name": "Room 3 · 4.jpeg",
            "url": "images/ROOM%203/4.jpeg"
        },
        {
            "name": "Room 3 · 5.jpeg",
            "url": "images/ROOM%203/5.jpeg"
        },
        {
            "name": "Room 3 · 6.jpeg",
            "url": "images/ROOM%203/6.jpeg"
        },
        {
            "name": "Room 3 · 7.jpeg",
            "url": "images/ROOM%203/7.jpeg"
        },
        {
            "name": "Room 3 · 8.jpeg",
            "url": "images/ROOM%203/8.jpeg"
        },
        {
            "name": "Room 3 · 9.jpeg",
            "url": "images/ROOM%203/9.jpeg"
        },
        {
            "name": "Room 3 · 10.jpeg",
            "url": "images/ROOM%203/10.jpeg"
        },
        {
            "name": "Room 3 · 11.jpeg",
            "url": "images/ROOM%203/11.jpeg"
        },
        {
            "name": "Room 3 · 12.jpeg",
            "url": "images/ROOM%203/12.jpeg"
        },
        {
            "name": "Room 3 · 13.jpeg",
            "url": "images/ROOM%203/13.jpeg"
        },
        {
            "name": "Room 3 · 14.jpeg",
            "url": "images/ROOM%203/14.jpeg"
        },
        {
            "name": "Room 3 · 15.jpeg",
            "url": "images/ROOM%203/15.jpeg"
        }
    ]
};
