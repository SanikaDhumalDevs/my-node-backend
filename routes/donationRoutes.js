// routes/donationRoutes.js
const express = require('express');
const router = express.Router();

// Helper function to get data for specific cities
const getCityData = (city) => {
    const cityLower = city.toLowerCase().trim();

    // 1. DATA FOR PUNE
    if (cityLower === 'pune') {
        return [
            {
                name: "Maher Foundation",
                address: "Vadu Budruk, Koregaon Bhima, Pune, Maharashtra",
                lat: 18.6298,
                lon: 74.0287
            },
            {
                name: "Robin Hood Army Pune",
                address: "Deccan Gymkhana, Near Bus Stop, Pune, Maharashtra",
                lat: 18.5158,
                lon: 73.8440
            },
            {
                name: "Jankalyan Samiti",
                address: "12, Sadashiv Peth, Pune, Maharashtra",
                lat: 18.5120,
                lon: 73.8540
            }
        ];
    }

    // 2. DATA FOR SATARA
    else if (cityLower === 'satara') {
        return [
            {
                name: "Satara Jeevan Foundation",
                address: "Powai Naka, Near Shivaji Statue, Satara, Maharashtra",
                lat: 17.6860,
                lon: 74.0180
            },
            {
                name: "Matoshree Old Age Home",
                address: "Godoli, Satara, Maharashtra",
                lat: 17.6910,
                lon: 74.0250
            },
            {
                name: "Samarth Seva Mandal",
                address: "Karanje Turf, Satara, Maharashtra",
                lat: 17.6800,
                lon: 74.0100
            }
        ];
    }

    // 3. DATA FOR KARAD
    else if (cityLower === 'karad') {
        return [
            {
                name: "Karad Jan Seva",
                address: "Kolhapur Naka, Karad, Maharashtra",
                lat: 17.2777,
                lon: 74.2081
            },
            {
                name: "Krishna Charitable Trust",
                address: "Malkapur, Karad, Maharashtra",
                lat: 17.2850,
                lon: 74.1950
            }
        ];
    }

    // 4. DATA FOR MUMBAI
    else if (cityLower === 'mumbai') {
        return [
            {
                name: "Feeding India Mumbai",
                address: "Andheri West, Mumbai, Maharashtra",
                lat: 19.1136,
                lon: 72.8697
            },
            {
                name: "Roti Bank",
                address: "Dadar East, Mumbai, Maharashtra",
                lat: 19.0178,
                lon: 72.8478
            }
        ];
    }

    // 5. GENERIC FALLBACK (If city is not in our list)
    else {
        return [
            {
                name: `Help ${city} Foundation`,
                address: `Main Market Road, ${city} Center`,
                lat: 0, 
                lon: 0
            },
            {
                name: `${city} Social Welfare`,
                address: `Station Road, ${city}`,
                lat: 0,
                lon: 0
            }
        ];
    }
};

// POST Route
router.post('/nearby', (req, res) => {
    const { city, country } = req.body;

    if (!city || !country) {
        return res.status(400).json({ message: "City and Country are required." });
    }

    console.log(`Searching for NGOs in: ${city}, ${country}`);

    // Get the specific data
    const centers = getCityData(city);

    const response = {
        city: city,
        country: country,
        donationCenters: centers
    };

    // Delay 1 second to feel like a real search
    setTimeout(() => {
        res.status(200).json(response);
    }, 800);
});

module.exports = router;