import { AIService } from './services/aiService.js';
import { TranslationService } from './services/translationService.js';
import { View } from './views/view.js';
import { FormController } from './controllers/formController.js';

(async function main() {
    // Initialize services and view
    const aiService = new AIService();
    const translationService = new TranslationService();
    const view = new View();

    // Set current year
    view.setYear();

    // Check requirements
    const errors = await aiService.checkRequirements();
    if (errors) {
        view.showError(errors);
        return;
    }

    // Initialize translation services
    try {
        const translatorAvailability = await translationService.initialize();

        // If translator is not available yet (downloadable or downloading),
        // we continue but may need user gesture to download
        if (translatorAvailability !== 'available') {
            console.log('Translator needs download, will be available on first use');
        }
    } catch (error) {
        console.error('Error initializing translation:', error);
        view.showError([error.message]);
        return;
    }

    // Get and initialize AI parameters
    const params = await aiService.getParams();
    view.initializeParameters(params);

    // Initialize controller and setup event listeners
    const controller = new FormController(aiService, translationService, view);
    controller.setupEventListeners();

    console.log('Application initialized successfully');
})();
