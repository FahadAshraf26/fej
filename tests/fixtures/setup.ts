import { getLatestEmailContent } from "../global/global";
import { test as setup } from "./fixture";

setup('Login using email and save session', async ({ page, context, settings, landingPage }) => { 
    console.log('Starting setup with email:', settings.userEmail);
    
    if (!process.env.MAILINATOR_API_KEY) {
        throw new Error('MAILINATOR_API_KEY environment variable is required');
    }

    try {
        // Navigate to the base URL
        await page.goto(settings.baseUrl);
        
        // Initiate login with email
        await landingPage.loginWithEmail(settings.userEmail);
        
        await landingPage.page.waitForTimeout(10000);
        // Wait for email to be sent and processed
        console.log('Waiting for magic link email...');
        await getLatestEmailContent(settings.userEmail, page);
        
        // Reload the page to ensure we're logged in
        await page.reload();
        
        // Save the authentication state
        await context.storageState({ path: "auth.json" });
        console.log('Setup completed successfully');
    } catch (error) {
        console.error('Setup failed:', error);
        throw error;
    }
});