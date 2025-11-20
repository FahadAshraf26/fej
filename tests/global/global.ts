import { expect, Page } from "@playwright/test";
import { MailinatorClient, GetInboxRequest, GetMessageRequest, Sort, Inbox, Message } from 'mailinator-client';

// Constants
const MAILINATOR_DOMAIN = "flapjackteam.testinator.com";
const EMAIL_CHECK_INTERVAL = 1000; // 1 second
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Types
interface ApiError extends Error {
    response?: {
        status: number;
        statusText: string;
        data: any;
    };
}

interface EmailConfig {
    apiKey: string;
    userEmail: string;
}

// Validation
function validateConfig(config: EmailConfig): void {
    if (!config.apiKey) {
        throw new Error('MAILINATOR_API_KEY environment variable is required');
    }
    if (!config.userEmail) {
        throw new Error('USER_EMAIL environment variable is required');
    }
}

// Initialize Mailinator client
function initializeMailinatorClient(apiKey: string): MailinatorClient {
    return new MailinatorClient(apiKey);
}

// Extract email components
function extractEmailComponents(emailAddress: string): { inboxName: string; domain: string } {
    const [inboxName, domain] = emailAddress.split('@');
    if (!inboxName || !domain) {
        throw new Error(`Invalid email address format: ${emailAddress}`);
    }
    return { inboxName, domain };
}

// Extract magic link from email body
function extractMagicLink(emailBody: string): string {
    const magicLinkMatch = emailBody?.match(/https?:\/\/[^\s"]+/);
    if (!magicLinkMatch) {
        throw new Error('No magic link found in email body');
    }
    
    return magicLinkMatch[0]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

// Handle magic link navigation
async function handleMagicLinkNavigation(page: Page, magicLink: string): Promise<void> {
    const context = page.context();
    const emailLoginPage = await context.newPage();
    
    try {
        await emailLoginPage.goto(magicLink);
        await emailLoginPage.waitForLoadState('networkidle');
        await page.waitForTimeout(5000); // Wait for auth state to be set
    } finally {
        await emailLoginPage.close();
    }
}

export async function getLatestEmailContent(emailAddress: string, page: Page): Promise<void> {
    // Initialize and validate
    const config: EmailConfig = {
        apiKey: process.env.MAILINATOR_API_KEY || '',
        userEmail: process.env.USER_EMAIL || ''
    };
    validateConfig(config);
    
    const mailinatorClient = initializeMailinatorClient(config.apiKey);
    const { inboxName } = extractEmailComponents(emailAddress);
    
    // Wait for the email to arrive
    const waitForLatestEmail = async (timeoutMs: number = DEFAULT_TIMEOUT): Promise<Message> => {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const inboxResponse = await mailinatorClient.request(
                    new GetInboxRequest(MAILINATOR_DOMAIN, inboxName, 0, 10, Sort.DESC, true)
                );

                const inbox = inboxResponse.result as Inbox;
                const messages = inbox.msgs;
                
                if (messages?.length > 0) {
                    const latestMessage = messages[0];
                    const messageResponse = await mailinatorClient.request(
                        new GetMessageRequest(MAILINATOR_DOMAIN, latestMessage.id)
                    );
                    
                    return messageResponse.result as Message;
                }
                
                await new Promise(resolve => setTimeout(resolve, EMAIL_CHECK_INTERVAL));
            } catch (error: unknown) {
                const apiError = error as ApiError;
                if (apiError.response) {
                    console.error('Mailinator API Error:', {
                        status: apiError.response.status,
                        statusText: apiError.response.statusText,
                        data: apiError.response.data
                    });
                }
                throw new Error(`Failed to fetch email: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        throw new Error(`Timeout waiting for email after ${timeoutMs}ms`);
    };

    try {
        // Get the email and extract the magic link
        const receivedEmail = await waitForLatestEmail();
        const emailBody = receivedEmail.parts?.[0]?.body;
        
        if (!emailBody) {
            throw new Error('No email body found in the message');
        }
        
        const magicLink = extractMagicLink(emailBody);
        await handleMagicLinkNavigation(page, magicLink);
        
    } catch (error: unknown) {
        console.error('Error in getLatestEmailContent:', error);
        throw error instanceof Error ? error : new Error(String(error));
    }
}
