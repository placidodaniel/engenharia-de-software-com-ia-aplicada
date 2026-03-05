
const aiContext = {
    session: null,
    abortController: null,
    isGenerating: false,
};

const elements = {
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temp-value'),
    topKValue: document.getElementById('topk-value'),
    topK: document.getElementById('topK'),
    form: document.getElementById('question-form'),
    questionInput: document.getElementById('question'),
    output: document.getElementById('output'),
    button: document.getElementById('ask-button'),
    year: document.getElementById('year'),
}

async function setupEventListeners() {

    // Update display values for range inputs
    elements.temperature.addEventListener('input', (e) => {
        elements.temperatureValue.textContent = e.target.value;
    });

    elements.topK.addEventListener('input', (e) => {
        elements.topKValue.textContent = e.target.value;
    });

    elements.form.addEventListener('submit', async function (event) {
        event.preventDefault();

        if (aiContext.isGenerating) {
            toggleSendOrStopButton(false)
            return;
        }

        onSubmitQuestion();
    });
}

async function onSubmitQuestion() {
    const questionInput = elements.questionInput;
    const output = elements.output;
    const question = questionInput.value;

    if (!question.trim()) {
        return;
    }

    // Get parameters from form
    const temperature = parseFloat(elements.temperature.value);
    const topK = parseInt(elements.topK.value);
    console.log('Using parameters:', { temperature, topK });

    // Change button to stop mode
    toggleSendOrStopButton(true)

    output.textContent = 'Processing your question...';
    const aiResponseChunks = await askAI(question, temperature, topK);
    output.textContent = '';

    for await (const chunk of aiResponseChunks) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        console.log('Received chunk:', chunk);
        output.textContent += chunk;
    }

    toggleSendOrStopButton(false);
}

function toggleSendOrStopButton(isGenerating) {
    if (isGenerating) {
        // Switch to stop mode
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Parar';
        elements.button.classList.add('stop-button');
    } else {
        // Switch to send mode
        aiContext.abortController?.abort();
        aiContext.isGenerating = isGenerating;
        elements.button.textContent = 'Enviar';
        elements.button.classList.remove('stop-button');
    }
}
async function* askAI(question, temperature, topK) {
    aiContext.abortController?.abort();
    aiContext.abortController = new AbortController();

    // Criar sessão apenas se não existir
    if (!aiContext.session) {
        aiContext.session = await LanguageModel.create({
            expectedInputLanguages: ["pt"],
            temperature: temperature,
            topK: topK,
            initialPrompts: [
                {
                    role: 'system',
                    content: `
                    Você é um assistente de IA que responde de forma clara e objetiva.
                    Responda sempre em formato de texto ao invés de markdown`
                },
            ],
        });
    }

    const responseStream = await aiContext.session.promptStreaming(
        [
            {
                role: 'user',
                content: question,
            },
        ],
        {
            signal: aiContext.abortController.signal,
        }
    );

    for await (const chunk of responseStream) {
        if (aiContext.abortController.signal.aborted) {
            break;
        }
        yield chunk;
    }
}

async function checkRequirements() {

    const errors = [];
    const returnResults = () => errors.length ? errors : null;

    const isChrome = !!window.chrome;

    if (!isChrome) {
        errors.push("⚠️ Este recurso só funciona no Google Chrome ou Chrome Canary.");
    }

    if (!('LanguageModel' in self)) {
        errors.push("⚠️ As APIs nativas de IA não estão ativas.");
        errors.push("Ative a flag em chrome://flags/");
        errors.push("Prompt API for Gemini Nano");
        errors.push("Depois reinicie o Chrome.");
        return returnResults();
    }

    const availability = await LanguageModel.availability({ languages: ["pt"] });
    console.log("Language Model Availability:", availability);

    if (availability === 'available') {
        return returnResults();
    }

    if (availability === 'unavailable') {
        errors.push("⚠️ Seu dispositivo não suporta o modelo de IA.");
    }

    if (availability === 'downloading') {
        errors.push("⚠️ O modelo está sendo baixado pelo Chrome. Aguarde alguns minutos.");
    }

    if (availability === 'downloadable') {
        errors.push("⚠️ O modelo será baixado automaticamente quando você fizer a primeira pergunta.");
    }

    return returnResults();
}

(async function main() {

    elements.year.textContent = new Date().getFullYear();

    const reqErrors = await checkRequirements();

    if (reqErrors) {
        elements.output.innerHTML = reqErrors.join('<br/>');
    }

    const params = await LanguageModel.params();

    console.log("Language Model Params:", params);

    elements.topK.max = params.maxTopK;
    elements.topK.min = 1;
    elements.topK.value = params.defaultTopK;
    elements.topKValue.textContent = params.defaultTopK;

    elements.temperatureValue.textContent = params.defaultTemperature;
    elements.temperature.max = params.maxTemperature;
    elements.temperature.min = 0;
    elements.temperature.value = params.defaultTemperature;

    setupEventListeners();

})();