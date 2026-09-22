const SUPABASE_URL = "https://euyvppbbhjrjcbgmdian.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/submit-deposit-wave`;

let settings = {};
let proofFile = null;
let currentStep = 1;

/* =========================
   UTILITAIRES
========================= */

const $ = id => document.getElementById(id);

function money(value) {
    return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function message(text, type = "info") {
    let box = $("depositMessage");

    if (!box) {
        box = document.createElement("div");
        box.id = "depositMessage";
        document.body.prepend(box);
    }

    box.textContent = text;
    box.className = type;
}

/* =========================
   PARAMÈTRES DEPUIS LA BASE
========================= */

async function loadSettings() {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/platform_settings?select=key,value`
    );

    if (!response.ok) {
        throw new Error("Impossible de charger les paramètres.");
    }

    const rows = await response.json();

    rows.forEach(row => {
        settings[row.key] = row.value;
    });

    // Les valeurs affichées viennent de la base
    document.querySelectorAll("[data-setting]").forEach(el => {
        const key = el.dataset.setting;

        if (settings[key] !== undefined) {
            el.textContent = settings[key];
        }
    });

    return settings;
}

/* =========================
   ÉTAPES
========================= */

function step(number) {
    currentStep = number;

    document.querySelectorAll("[data-step]").forEach(el => {
        el.style.display =
            Number(el.dataset.step) === number ? "" : "none";
    });
}

/* =========================
   PREUVE
========================= */

function selectProof(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        event.target.value = "";
        message("Format accepté : JPG, PNG ou WebP.", "error");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        event.target.value = "";
        message("La preuve ne doit pas dépasser 10 Mo.", "error");
        return;
    }

    proofFile = file;

    const name = $("proofFileName");
    if (name) name.textContent = file.name;
}

/* =========================
   DÉPÔT
========================= */

async function submitDeposit() {
    const amount = Number($("amount")?.value || 0);
    const payerPhone = $("payerPhone")?.value.trim();
    const proof = proofFile;

    if (!amount || amount <= 0) {
        message("Veuillez entrer le montant du dépôt.", "error");
        return;
    }

    const minimum = Number(
        settings.minimum_deposit ||
        settings.min_deposit ||
        3000
    );

    if (amount < minimum) {
        message(`Le dépôt minimum est de ${money(minimum)}.`, "error");
        return;
    }

    if (!payerPhone) {
        message(
            "Veuillez entrer le numéro ayant effectué le paiement.",
            "error"
        );
        return;
    }

    if (!proof) {
        message(
            "Veuillez joindre la preuve de paiement.",
            "error"
        );
        return;
    }

    /*
     * Ces informations doivent déjà être présentes
     * dans la session/localStorage de l'application.
     */
    const user = JSON.parse(
        localStorage.getItem("user") ||
        localStorage.getItem("currentUser") ||
        "{}"
    );

    const phone =
        user.phone ||
        user.phone_number ||
        localStorage.getItem("phone");

    const password =
        user.password ||
        localStorage.getItem("password");

    const countryId =
        user.country_id ||
        localStorage.getItem("country_id");

    if (!phone || !password || !countryId) {
        message(
            "Session utilisateur introuvable. Veuillez vous reconnecter.",
            "error"
        );
        return;
    }

    const form = new FormData();

    form.append("phone", phone);
    form.append("password", password);
    form.append("amount", amount);
    form.append("payer_phone", payerPhone);
    form.append("country_id", countryId);
    form.append("proof", proof);

    const button = $("submitDeposit");

    if (button) {
        button.disabled = true;
        button.textContent = "Envoi...";
    }

    try {
        const response = await fetch(FUNCTION_URL, {
            method: "POST",
            body: form
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "Erreur lors de l'envoi du dépôt."
            );
        }

        if ($("transactionReference")) {
            $("transactionReference").textContent =
                data.deposit?.transaction_id || "";
        }

        if ($("successAmount")) {
            $("successAmount").textContent = money(amount);
        }

        step(4);

        message(
            "Dépôt envoyé. Il sera vérifié avant le crédit de votre solde.",
            "success"
        );

    } catch (error) {
        console.error(error);
        message(error.message, "error");

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Confirmer le dépôt";
        }
    }
}

/* =========================
   INITIALISATION
========================= */

document.addEventListener("DOMContentLoaded", async () => {

    try {
        await loadSettings();
    } catch (error) {
        console.error(error);
        message("Impossible de charger les paramètres.", "error");
    }

    step(1);

    const proof = $("proof");

    if (proof) {
        proof.addEventListener("change", selectProof);
    }

    document.querySelectorAll("[data-next]").forEach(button => {
        button.addEventListener("click", () => {
            if (currentStep < 4) step(currentStep + 1);
        });
    });

    document.querySelectorAll("[data-prev]").forEach(button => {
        button.addEventListener("click", () => {
            if (currentStep > 1) step(currentStep - 1);
        });
    });

    $("submitDeposit")?.addEventListener(
        "click",
        submitDeposit
    );
});
