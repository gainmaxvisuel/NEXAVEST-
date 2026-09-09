"use strict";

/* =========================================================
   CONFIGURATION SUPABASE
========================================================= */

const SUPABASE_URL =
    "https://wyhpqnvctzwtjzhxyduv.supabase.co";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5aHBxbnZjdHp3dGp6aHh5ZHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTM0NTUsImV4cCI6MjEwMjQ2OTQ1NX0.RYHg__saoyzAIDfXmjK_2P6sCbi1jvc4QJanFECxjRw";


/* =========================================================
   CONFIGURATION ORANGE MONEY
========================================================= */

const ORANGE_MERCHANT_NUMBER = "45250868";

const ORANGE_MERCHANT_NAME = "Sagnon Gaoussou";


/* =========================================================
   VARIABLES
========================================================= */

let currentUser = null;

let selectedAmount = 0;

let selectedPhone = "";

let currentDepositId = null;

let minimumDeposit = 2000;


/* =========================================================
   INITIALISATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    await initialize();

});


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

    try {

        loadUser();

        if (!currentUser) {
            showStatus(
                "status1",
                "Votre session a expiré. Veuillez vous reconnecter.",
                "error"
            );

            disablePage();

            return;
        }

        await loadPlatformSettings();

        setupEvents();

    } catch (error) {

        console.error("Erreur initialisation :", error);

        showStatus(
            "status1",
            "Une erreur est survenue lors du chargement de la page.",
            "error"
        );

    }

}


/* =========================================================
   UTILISATEUR
========================================================= */

function loadUser() {

    const rawUser =
        sessionStorage.getItem("nexavest_user");

    if (!rawUser) {
        currentUser = null;
        return;
    }

    try {

        currentUser = JSON.parse(rawUser);

        if (
            !currentUser ||
            !currentUser.user_id
        ) {
            currentUser = null;
        }

    } catch (error) {

        console.error(
            "Session utilisateur invalide :",
            error
        );

        currentUser = null;
    }

}


/* =========================================================
   PARAMÈTRES DE LA PLATEFORME
========================================================= */

async function loadPlatformSettings() {

    try {

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/platform_settings?select=minimum_deposit_xof&limit=1`,
            {
                method: "GET",

                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Impossible de charger les paramètres."
            );
        }

        const data = await response.json();

        if (
            Array.isArray(data) &&
            data.length > 0 &&
            data[0].minimum_deposit_xof
        ) {

            minimumDeposit =
                Number(data[0].minimum_deposit_xof);

        }

    } catch (error) {

        console.warn(
            "Paramètres plateforme indisponibles, minimum par défaut :",
            error
        );

        minimumDeposit = 2000;
    }

}


/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function setupEvents() {

    /* Boutons de montant */

    document
        .querySelectorAll(".amount-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const amount =
                        Number(button.dataset.amount);

                    selectAmount(
                        amount,
                        button
                    );

                }
            );

        });


    /* Montant personnalisé */

    const customAmount =
        document.getElementById("customAmount");

    customAmount.addEventListener(
        "input",
        () => {

            const value =
                Number(customAmount.value);

            document
                .querySelectorAll(".amount-btn")
                .forEach(button => {

                    button.classList.remove(
                        "selected"
                    );

                });

            selectedAmount = value;

            currentDepositId = null;

        }
    );


    /* Page 1 */

    document
        .getElementById("confirmAmountBtn")
        .addEventListener(
            "click",
            confirmAmount
        );


    /* Page 2 */

    document
        .getElementById("confirmPhoneBtn")
        .addEventListener(
            "click",
            confirmPhone
        );


    /* Retour */

    document
        .getElementById("backToPage1Btn")
        .addEventListener(
            "click",
            () => showPage(1)
        );

    document
        .getElementById("backToPage2Btn")
        .addEventListener(
            "click",
            () => showPage(2)
        );


    /* Paiement */

    document
        .getElementById("payBtn")
        .addEventListener(
            "click",
            launchUSSD
        );


    /* Copier */

    document
        .getElementById("copyUssdBtn")
        .addEventListener(
            "click",
            copyUSSD
        );


    /* Rafraîchir */

    document
        .getElementById("refreshBtn")
        .addEventListener(
            "click",
            refreshStatus
        );

}


/* =========================================================
   SÉLECTION MONTANT
========================================================= */

function selectAmount(amount, button) {

    selectedAmount = Number(amount);

    currentDepositId = null;

    document
        .querySelectorAll(".amount-btn")
        .forEach(item => {

            item.classList.remove(
                "selected"
            );

        });

    button.classList.add("selected");

    document.getElementById(
        "customAmount"
    ).value = "";

}


/* =========================================================
   CONFIRMATION DU MONTANT
========================================================= */

function confirmAmount() {

    clearStatus("status1");

    const customValue =
        Number(
            document.getElementById(
                "customAmount"
            ).value
        );

    if (customValue > 0) {
        selectedAmount = customValue;
    }

    if (
        !selectedAmount ||
        selectedAmount <= 0
    ) {

        showStatus(
            "status1",
            "Veuillez sélectionner ou saisir un montant.",
            "error"
        );

        return;
    }


    if (selectedAmount < minimumDeposit) {

        showStatus(
            "status1",
            `Le dépôt minimum est de ${formatAmount(minimumDeposit)} XOF.`,
            "error"
        );

        return;
    }


    updateAmountDisplays();

    showPage(2);

}


/* =========================================================
   AFFICHAGE MONTANT
========================================================= */

function updateAmountDisplays() {

    const formatted =
        `${formatAmount(selectedAmount)} XOF`;

    document.getElementById(
        "page2Amount"
    ).textContent = formatted;

    document.getElementById(
        "page3Amount"
    ).textContent = formatted;

}


/* =========================================================
   CONFIRMATION DU NUMÉRO
========================================================= */

async function confirmPhone() {

    clearStatus("status2");

    const phoneInput =
        document.getElementById("phone");

    selectedPhone =
        phoneInput.value.trim();


    if (!selectedPhone) {

        showStatus(
            "status2",
            "Veuillez saisir votre numéro Orange Money.",
            "error"
        );

        return;
    }


    const cleanedPhone =
        selectedPhone.replace(
            /[\s\-().]/g,
            ""
        );


    /*
       Burkina Faso :
       8 chiffres après +226
    */

    let localPhone = cleanedPhone;

    if (localPhone.startsWith("+226")) {
        localPhone =
            localPhone.substring(4);
    }

    if (localPhone.startsWith("226")) {
        localPhone =
            localPhone.substring(3);
    }


    if (!/^[0-9]{8}$/.test(localPhone)) {

        showStatus(
            "status2",
            "Veuillez saisir un numéro burkinabè valide de 8 chiffres.",
            "error"
        );

        return;
    }


    selectedPhone = localPhone;


    const button =
        document.getElementById(
            "confirmPhoneBtn"
        );

    button.classList.add("loading");

    button.textContent =
        "Préparation du paiement...";


    try {

        /*
         * Si un dépôt pending existe déjà
         * pour cette session, on le réutilise.
         */

        if (!currentDepositId) {

            currentDepositId =
                await createDeposit();

        }


        generateUSSD();

        showPage(3);

        showStatus(
            "status3",
            "Votre demande de dépôt est enregistrée. Effectuez maintenant le paiement Orange Money.",
            "info"
        );

    } catch (error) {

        console.error(
            "Erreur création dépôt :",
            error
        );

        showStatus(
            "status2",
            error.message ||
            "Impossible de créer la demande de dépôt.",
            "error"
        );

    } finally {

        button.classList.remove(
            "loading"
        );

        button.textContent =
            "Confirmer";

    }

}


/* =========================================================
   CRÉER LE DÉPÔT SUPABASE
========================================================= */

async function createDeposit() {

    if (!currentUser) {
        throw new Error(
            "Utilisateur non connecté."
        );
    }


    /*
     * Fonction actuelle :
     *
     * public.create_deposit(
     *   p_user_id uuid,
     *   p_amount numeric,
     *   p_payment_method varchar,
     *   p_payment_reference varchar
     * )
     */

    const response =
        await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/create_deposit`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "apikey":
                        SUPABASE_ANON_KEY,

                    "Authorization":
                        `Bearer ${SUPABASE_ANON_KEY}`,

                    "Prefer":
                        "return=representation"
                },

                body: JSON.stringify({

                    p_user_id:
                        currentUser.user_id,

                    p_amount:
                        selectedAmount,

                    p_payment_method:
                        "ORANGE_MONEY",

                    p_payment_reference:
                        selectedPhone

                })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "Erreur RPC create_deposit :",
            data
        );

        throw new Error(
            data.message ||
            data.hint ||
            data.details ||
            data.error ||
            "La création du dépôt a échoué."
        );

    }


    /*
     * RETURNS TABLE :
     *
     * deposit_id
     * professional_transaction_id
     * amount
     * status
     * created_at
     */

    if (
        Array.isArray(data) &&
        data.length > 0
    ) {

        if (data[0].deposit_id) {
            return data[0].deposit_id;
        }

    }


    if (
        data &&
        data.deposit_id
    ) {

        return data.deposit_id;

    }


    /*
     * Sécurité supplémentaire :
     * récupérer le dernier dépôt pending
     * si la RPC ne renvoie pas directement l'ID.
     */

    const latest =
        await getLatestPendingDeposit();


    if (latest) {
        return latest.id;
    }


    throw new Error(
        "Le dépôt a été créé mais son identifiant n'a pas pu être récupéré."
    );

}


/* =========================================================
   RÉCUPÉRER LE DERNIER DÉPÔT PENDING
========================================================= */

async function getLatestPendingDeposit() {

    const url =
        `${SUPABASE_URL}/rest/v1/deposits` +
        `?select=id,amount_xof,status,requested_at,processed_at,admin_note` +
        `&user_id=eq.${encodeURIComponent(currentUser.user_id)}` +
        `&amount_xof=eq.${encodeURIComponent(selectedAmount)}` +
        `&status=eq.pending` +
        `&order=requested_at.desc` +
        `&limit=1`;


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    "apikey":
                        SUPABASE_ANON_KEY,

                    "Authorization":
                        `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
        );


    if (!response.ok) {
        return null;
    }


    const data =
        await response.json();


    if (
        Array.isArray(data) &&
        data.length > 0
    ) {

        return data[0];

    }


    return null;

}


/* =========================================================
   GÉNÉRER LE CODE USSD
========================================================= */

function generateUSSD() {

    const ussd =
        `*144*2*1*${ORANGE_MERCHANT_NUMBER}*${selectedAmount}#`;


    document.getElementById(
        "ussdCode"
    ).textContent = ussd;

}


/* =========================================================
   OUVRIR ORANGE MONEY
========================================================= */

function launchUSSD() {

    if (
        !selectedAmount ||
        selectedAmount <= 0
    ) {

        showStatus(
            "status3",
            "Montant de paiement invalide.",
            "error"
        );

        return;
    }


    const ussd =
        `*144*2*1*${ORANGE_MERCHANT_NUMBER}*${selectedAmount}#`;


    /*
     * Ouvre l'application téléphone
     * avec le code USSD.
     */

    window.location.href =
        "tel:" +
        encodeURIComponent(ussd);

}


/* =========================================================
   COPIER LE CODE USSD
========================================================= */

async function copyUSSD() {

    const ussd =
        document.getElementById(
            "ussdCode"
        ).textContent;


    try {

        await navigator.clipboard.writeText(
            ussd
        );


        showStatus(
            "status3",
            "Code USSD copié. Vous pouvez maintenant le composer.",
            "success"
        );


    } catch (error) {

        /*
         * Fallback pour certains navigateurs.
         */

        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.value = ussd;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand(
            "copy"
        );

        textarea.remove();


        showStatus(
            "status3",
            "Code USSD copié.",
            "success"
        );

    }

}


/* =========================================================
   VÉRIFIER LE STATUT DU DÉPÔT
========================================================= */

async function refreshStatus() {

    clearStatus("status3");

    if (!currentDepositId) {

        showStatus(
            "status3",
            "Aucun dépôt en cours à vérifier.",
            "error"
        );

        return;
    }


    const button =
        document.getElementById(
            "refreshBtn"
        );

    button.classList.add(
        "loading"
    );

    button.textContent =
        "Vérification...";


    try {

        const url =
            `${SUPABASE_URL}/rest/v1/deposits` +
            `?select=id,amount_xof,status,requested_at,processed_at,admin_note` +
            `&id=eq.${encodeURIComponent(currentDepositId)}` +
            `&user_id=eq.${encodeURIComponent(currentUser.user_id)}` +
            `&limit=1`;


        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        "apikey":
                            SUPABASE_ANON_KEY,

                        "Authorization":
                            `Bearer ${SUPABASE_ANON_KEY}`
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                "Impossible de vérifier le statut."
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            throw new Error(
                "Dépôt introuvable."
            );

        }


        const deposit =
            data[0];


        handleDepositStatus(
            deposit
        );


    } catch (error) {

        console.error(
            "Erreur statut dépôt :",
            error
        );

        showStatus(
            "status3",
            error.message ||
            "Erreur pendant la vérification.",
            "error"
        );

    } finally {

        button.classList.remove(
            "loading"
        );

        button.textContent =
            "↻ Rafraîchir le statut";

    }

}


/* =========================================================
   TRAITER LE STATUT
========================================================= */

function handleDepositStatus(deposit) {

    const status =
        String(
            deposit.status || ""
        ).toLowerCase();


    if (
        status === "approved" ||
        status === "completed" ||
        status === "success"
    ) {

        showStatus(
            "status3",
            "✅ Paiement confirmé. Votre dépôt a été validé.",
            "success"
        );

        return;
    }


    if (
        status === "rejected" ||
        status === "cancelled" ||
        status === "failed"
    ) {

        let message =
            "❌ Votre demande de dépôt a été refusée.";


        if (deposit.admin_note) {

            message +=
                ` Motif : ${deposit.admin_note}`;

        }


        showStatus(
            "status3",
            message,
            "error"
        );

        return;
    }


    /*
     * pending
     */

    showStatus(
        "status3",
        "⏳ Votre paiement n'est pas encore confirmé. Si vous avez déjà payé, attendez la validation puis appuyez de nouveau sur « Rafraîchir le statut ».",
        "info"
    );

}


/* =========================================================
   NAVIGATION ENTRE LES PAGES
========================================================= */

function showPage(pageNumber) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active"
            );

        });


    const target =
        document.getElementById(
            `page${pageNumber}`
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   STATUS MESSAGE
========================================================= */

function showStatus(
    elementId,
    message,
    type = "info"
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.className =
        `status show ${type}`;

}


/* =========================================================
   EFFACER STATUS
========================================================= */

function clearStatus(elementId) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent = "";

    element.className =
        "status";

}


/* =========================================================
   FORMATAGE XOF
========================================================= */

function formatAmount(amount) {

    return Number(amount)
        .toLocaleString(
            "fr-FR"
        );

}


/* =========================================================
   DÉSACTIVER LA PAGE
========================================================= */

function disablePage() {

    document
        .querySelectorAll(
            "button, input"
        )
        .forEach(element => {

            element.disabled = true;

        });
}
