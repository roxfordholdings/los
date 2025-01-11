<script>
    const ipstackApiKey = "35a5cd9a183848a794be50705f5485cd"; // Your IPStack API key
    const webhookUrl = "https://services.leadconnectorhq.com/hooks/NkEfgAuwy5oYL3hUR3wW/webhook-trigger/RcByk57dGX5df8HGklVq"; // Webhook URL

    // Utility function to get a query parameter by name
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Generate or retrieve a persistent Visitor ID
    function setVisitorId() {
        // Check if the visitor ID is provided via a trigger link (URL)
        const urlVisitorId = getQueryParam("visitorId");

        if (urlVisitorId) {
            // Save the URL-provided visitor ID in localStorage
            localStorage.setItem("persistentVisitorId", urlVisitorId);
            return urlVisitorId;
        }

        // Otherwise, use the existing one or create a new one
        let visitorId = localStorage.getItem("persistentVisitorId");
        if (!visitorId) {
            visitorId = `Visitor_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            localStorage.setItem("persistentVisitorId", visitorId);
        }
        return visitorId;
    }

    const visitorId = setVisitorId();

    // Retrieve email from cookies
    function getEmailFromCookies() {
        const cookies = document.cookie.split("; ");
        for (let i = 0; i < cookies.length; i++) {
            const [key, value] = cookies[i].split("=");
            if (key === "email") {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    // Determine email for the payload
    function determineEmail(realEmail = null) {
        const storedEmail = getEmailFromCookies();
        if (realEmail) {
            // Save real email in cookies for future use
            document.cookie = `email=${encodeURIComponent(realEmail)};path=/;max-age=${60 * 60 * 24 * 7}`;
            return realEmail;
        }
        return storedEmail || `${visitorId}@visitor.elevationbrokerage.com`; // Fallback to placeholder email
    }

    // Fetch geo-location using IPStack
    async function fetchGeoLocation() {
        try {
            const response = await fetch(`https://api.ipstack.com/check?access_key=${ipstackApiKey}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Error fetching geo-location:", error);
            return null;
        }
    }

    // Send data to the webhook
    function sendToWebhook(eventName, eventDetails = {}, geoData = null, realEmail = null) {
        const email = determineEmail(realEmail);

        const payload = {
            visitorId: visitorId,
            eventName: eventName,
            eventDetails: {
                ...eventDetails,
                url: window.location.href,
                timestamp: new Date().toISOString(),
            },
            email: email,
            customFields: {
                visitorId: visitorId,
                city: geoData?.city || null,
                state: geoData?.region_name || null,
                country: geoData?.country_name || null,
                zipcode: geoData?.zip || null,
            },
        };

        console.log("Payload Sent to Webhook:", payload);

        fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }).catch((error) => console.error("Error sending to webhook:", error));
    }

    // Track Page Views
    async function trackPageView() {
        const geoData = await fetchGeoLocation();
        sendToWebhook("Page View", {}, geoData);
    }

    // Track Link Clicks
    function trackLinkClicks() {
        document.addEventListener("click", (event) => {
            const target = event.target.closest("a");
            if (target) {
                fetchGeoLocation().then((geoData) => {
                    sendToWebhook(
                        "Link Click",
                        { href: target.href, text: target.innerText || "Unnamed Link" },
                        geoData
                    );
                });
            }
        });
    }

    // Track Button Clicks
    function trackButtonClicks() {
        document.addEventListener("click", (event) => {
            const target = event.target.closest("button");
            if (target) {
                fetchGeoLocation().then((geoData) => {
                    sendToWebhook(
                        "Button Click",
                        { text: target.innerText || "Unnamed Button" },
                        geoData
                    );
                });
            }
        });
    }

    // Track Image Clicks
    function trackImageClicks() {
        document.addEventListener("click", (event) => {
            const target = event.target.closest("img");
            if (target) {
                fetchGeoLocation().then((geoData) => {
                    sendToWebhook(
                        "Image Click",
                        { src: target.src, alt: target.alt || "Unnamed Image" },
                        geoData
                    );
                });
            }
        });
    }

    // Track Form Submissions
    function trackFormSubmissions() {
        document.querySelectorAll("form").forEach((form) => {
            form.addEventListener("submit", (event) => {
                const formData = new FormData(form);
                const realEmail = formData.get("email");
                const phone = formData.get("phone");

                fetchGeoLocation().then((geoData) => {
                    sendToWebhook(
                        "Form Submission",
                        {
                            name: formData.get("name") || "Unnamed Visitor",
                            phone: phone,
                        },
                        geoData,
                        realEmail // Prioritize real email
                    );
                });
            });
        });
    }

    // Initialize Tracking
    trackPageView();
    trackLinkClicks();
    trackButtonClicks();
    trackImageClicks();
    trackFormSubmissions();
</script>