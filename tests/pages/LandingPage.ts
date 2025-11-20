import { Locator, Page } from "@playwright/test";

export class LandingPage {
    readonly page: Page;
    readonly loginWithEmailBtn: Locator;
    readonly emailInput: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginWithEmailBtn = this.page.getByRole('button', { name: 'Log in with Email' });
        this.emailInput = this.page.getByPlaceholder('Enter your email address');
    }

    async loginWithEmail(email: string) {
        await this.loginWithEmailBtn.click();
        await this.emailInput.fill(email);
        await this.loginWithEmailBtn.click();
    }
}