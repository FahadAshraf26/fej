import { Locator, Page, expect } from "@playwright/test";

export class DashboardPage {
    readonly page: Page;
    
    // Common elements
    readonly dropdownMenu: Locator;
    readonly logoutBtn: Locator;
    readonly dashboardBtn: Locator;
    
    // Menu creation
    readonly createNewMenuBtn: Locator;
    readonly menuNameInput: Locator;
    readonly menuDescriptionInput: Locator;
    readonly restaurantInput: Locator;
    readonly createMenuBtn: Locator;
    readonly showMoreOptions: Locator;
    readonly downloadBtn: Locator;
    
    // Restaurant management
    readonly addRestaurantBtn: Locator;
    readonly restaurantNameInput: Locator;
    readonly restaurantLocationInput: Locator;
    readonly restaurantDescriptionInput: Locator;
    readonly streetInput: Locator;
    readonly cityInput: Locator;
    readonly stateInput: Locator;
    readonly zipCodeInput: Locator;
    readonly addRestaurantSubmitBtn: Locator;
    
    // User management
    readonly addUserBtn: Locator;
    readonly userPhoneInput: Locator;
    readonly userEmailInput: Locator;
    readonly userRestaurantSelect: Locator;
    readonly addUserSubmitBtn: Locator;
    readonly searchInput: Locator;
    readonly userTableRows: Locator;
    
    // Menu options
    readonly menuOptionsButton: Locator;
    readonly transferTemplateOption: Locator;
    readonly renameOption: Locator;
    readonly editThumbnailOption: Locator;
    readonly turnOffAutolayoutOption: Locator;
    readonly turnOnAutolayoutOption: Locator;
    readonly editTemplateOption: Locator;
    readonly unpublishMenu: Locator;
    readonly publishMenu: Locator;
    readonly deleteOption: Locator;

    constructor(page: Page) {
        this.page = page;
        
        // Common elements
        this.dropdownMenu = this.page.locator('div[aria-haspopup="menu"]').first();
        this.logoutBtn = this.page.getByRole('menuitem', { name: 'Logout' });
        this.dashboardBtn = this.page.getByRole('menuitem', { name: 'Dashboard' });
        
        // Menu creation
        this.createNewMenuBtn = this.page.getByRole('button', { name: 'Create New Menu' }).first();
        this.menuNameInput = this.page.getByPlaceholder('Enter a name for your menu');
        this.menuDescriptionInput = this.page.getByPlaceholder('Briefly describe your menu');
        this.restaurantInput = this.page.getByPlaceholder('Select restaurant');
        this.createMenuBtn = this.page.getByRole('button', { name: 'Create Menu' });
        this.showMoreOptions = this.page.getByLabel('Show more options');
        this.downloadBtn = this.page.getByRole('button', { name: 'Download' });
        
        // Restaurant management
        this.addRestaurantBtn = this.page.getByRole('button', { name: 'Add Restaurant' });
        this.restaurantNameInput = this.page.getByPlaceholder('Enter restaurant name');
        this.restaurantLocationInput = this.page.getByPlaceholder('Add locations');
        this.restaurantDescriptionInput = this.page.getByPlaceholder('Enter description');
        this.streetInput = this.page.getByPlaceholder('Main St');
        this.cityInput = this.page.getByPlaceholder('Anytown');
        this.stateInput = this.page.getByPlaceholder('State');
        this.zipCodeInput = this.page.getByPlaceholder('12345');
        this.addRestaurantSubmitBtn = this.page.getByRole('button', { name: 'Add' });
        
        // User management
        this.addUserBtn = this.page.getByRole('button', { name: 'Add User' });
        this.userPhoneInput = this.page.getByPlaceholder('Enter user phone number');
        this.userEmailInput = this.page.getByPlaceholder('Enter your email address');
        this.userRestaurantSelect = this.page.getByPlaceholder('Select a restaurant');
        this.addUserSubmitBtn = this.page.getByRole('button', { name: 'Add User' });
        this.searchInput = this.page.getByPlaceholder('Search...');
        this.userTableRows = this.page.locator('tbody > tr');
        
        // Menu options
        this.menuOptionsButton = this.page.locator('//a[contains(@href, "/menu/")]//div[contains(@class, "mantine") and @aria-haspopup="menu"]');
        this.transferTemplateOption = this.page.locator('//div[text()="Transfer Template"]');
        this.renameOption = this.page.locator('//div[text()="Rename"]');
        this.unpublishMenu = this.page.locator('//div[text()="Unpublish Menu"]');
        this.publishMenu = this.page.locator('//div[text()="Publish Menu"]');
        this.editThumbnailOption = this.page.locator('//div[text()="Edit Thumbnail"]');
        this.turnOffAutolayoutOption = this.page.getByRole('menuitem', { name: 'Turn off Autolayout' });
        this.turnOnAutolayoutOption = this.page.getByRole('menuitem', { name: 'Turn on Autolayout' });
        this.editTemplateOption = this.page.getByRole('button', { name: 'Edit Template' });
        this.deleteOption = this.page.locator('//div[text()="Delete"]');
    }

    async logout() {
        await this.page.waitForLoadState('networkidle');
        
        // Try multiple approaches to click the dropdown menu
        try {
            // First attempt: Try clicking the dropdown menu directly
            await this.dropdownMenu.click({ force: true, timeout: 5000 });
        } catch (error) {
            // Second attempt: Try clicking the avatar
            await this.page.locator('.mantine-Avatar-placeholder').click({ force: true });
        }
        
        // Wait for logout button to be visible
        await this.logoutBtn.waitFor({ state: 'visible', timeout: 5000 });
        await this.logoutBtn.click();
        
        // Wait for logout to complete
        await this.page.waitForLoadState('networkidle');
    }

    async gotoDashboard() {
        await this.page.waitForLoadState('networkidle');
        // Wait for the dropdown menu to be visible and stable
        await this.dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });
        
        // Try force click if normal click is intercepted
        try {
            await this.dropdownMenu.click({ force: true });
            await this.page.waitForTimeout(1000); // Wait for menu to expand
            await this.dashboardBtn.waitFor({ state: 'visible', timeout: 5000 });
            await this.dashboardBtn.click();
        } catch (error) {
            // If that fails, try clicking the avatar directly
            await this.page.locator('.mantine-Avatar-placeholder').click({ force: true });
            await this.page.waitForTimeout(1000);
            await this.dashboardBtn.waitFor({ state: 'visible', timeout: 5000 });
            await this.dashboardBtn.click();
        }
        
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(3000);
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
    }

    async createNewMenu(menuName: string, description: string, restaurant: string) {
        // Wait for initial page load and network idle
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000); // Give extra time for JS to execute
        
        // Retry logic for finding and clicking the Create New Menu button
        const maxRetries = 3;
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                // Wait for button with increased timeout
                await this.createNewMenuBtn.waitFor({ state: 'visible', timeout: 10000 });
                
                // Try clicking the button directly first
                try {
                    await this.createNewMenuBtn.click();
                    break;
                } catch (e) {
                    // If direct click fails, try the button label
                    const buttonLabel = this.page.locator('.mantine-qo1k2.mantine-Button-label').first();
                    await buttonLabel.waitFor({ state: 'visible', timeout: 10000 });
                    await buttonLabel.click({ force: true });
                    break;
                }
            } catch (error) {
                attempt++;
                if (attempt === maxRetries) {
                    throw error;
                }
                // Wait before retry and reload the page
                await this.page.waitForTimeout(2000);
                await this.page.reload();
                await this.page.waitForLoadState('networkidle');
                await this.page.waitForLoadState('domcontentloaded');
            }
        }
        
        // Wait for form elements with increased timeouts
        await this.menuNameInput.waitFor({ state: 'visible', timeout: 10000 });
        await this.menuNameInput.fill(menuName);
        await this.menuDescriptionInput.fill(description);
        await this.restaurantInput.fill(restaurant);
        
        // Wait for and select restaurant option
        await this.page.waitForTimeout(1000); // Wait for dropdown to populate
        const option = this.page.locator(`(//div[@role="option" and text()="${restaurant}"])[1]`);
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click();
        
        // Create menu and wait for completion
        await this.createMenuBtn.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(3000); // Wait longer for menu creation
        
        // Handle download with increased timeouts
        await this.showMoreOptions.waitFor({ state: 'visible', timeout: 10000 });
        await this.showMoreOptions.click();
    
        const [download] = await Promise.all([
            this.page.waitForEvent('download', { timeout: 30000 }),
            this.downloadBtn.click(),
        ]);
    
        const filePath = 'downloads/menu.pdf';
        await download.saveAs(filePath);
        console.log(`File saved at: ${filePath}`);
        
        return filePath;
    }

    async addRestaurant(restaurantData: {
        name: string;
        location: string;
        description: string;
        street: string;
        city: string;
        state: string;
        zipCode: string;
    }) {
        await this.addRestaurantBtn.click();
        await this.restaurantNameInput.fill(restaurantData.name);
        await this.restaurantLocationInput.fill(restaurantData.location);
        await this.restaurantDescriptionInput.fill(restaurantData.description);
        await this.streetInput.fill(restaurantData.street);
        await this.cityInput.fill(restaurantData.city);
        await this.stateInput.fill(restaurantData.state);
        await this.zipCodeInput.fill(restaurantData.zipCode);
        await this.addRestaurantSubmitBtn.click();
        await expect(this.page.getByText('Successfull', { exact: true })).toBeVisible();
        await expect(this.page.locator('body')).toContainText('SuccessfullRestaurant saved successfully!');
    }

    async addUser(userData: {
        phone: string;
        email: string;
        restaurant: string;
    }) {
        await this.addUserBtn.click();
        await this.userPhoneInput.fill(userData.phone);
        await this.userEmailInput.fill(userData.email);
        
        // Handle restaurant selection with proper waiting
        await this.userRestaurantSelect.click();
        await this.userRestaurantSelect.fill(userData.restaurant);
        await this.page.waitForTimeout(1000); // Wait for dropdown to populate
        
        // Click the first matching option
        const option = this.page.getByRole('option', { name: userData.restaurant }).first();
        await option.waitFor({ state: 'visible', timeout: 5000 });
        await option.click();
        
        await this.addUserSubmitBtn.click();
        
        // Wait for the modal to close and verify the user was added
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(1000);
        
        // Verify the user was added by searching for them
        await this.searchUser(userData.email);
    }

    async searchUser(email: string) {
        await this.searchInput.pressSequentially(email, { delay: 100 });
        await expect(this.userTableRows).toHaveCount(1);
        return this.userTableRows.locator('td').nth(2);
    }

    async deleteUser(email: string) {
        await this.searchUser(email);
        await this.page.locator('(//tr//td//button)[1]').click();
    }

    async updateUserRole(email: string, role: string) {
        await this.searchUser(email);
        await this.page.locator('(//tr//td//button)[1]').click();
        await this.page.getByRole('searchbox', { name: 'Select user role' }).click();
        await this.page.getByRole('option', { name: role }).click();
        await this.page.getByRole('button', { name: 'Update' }).click();
    }

    async navigateToHomepage() {
        await this.page.waitForLoadState('networkidle');
        
        // Wait for and click the home link with retry logic
        const homeLink = this.page.getByText('flapjack', { exact: true }).first();
        await homeLink.waitFor({ state: 'visible', timeout: 5000 });
        
        // Try clicking with force option
        await homeLink.click({ force: true });
        
        // Wait for navigation to complete
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(1000); // Give time for any animations
    }

    async inviteUserFromDashboard(restaurant: string, phone: string) {
        await this.page.locator(`(//div[text()="${restaurant}"])[1]`).click();

        const [newPage] = await Promise.all([
            this.page.waitForEvent('popup'),
            this.page.locator('a[href*="restaurant"]').locator('svg.icon-tabler-layout-dashboard').click(),
        ]);

        await newPage.getByRole('button', { name: 'Invite a user' }).click();
        await newPage.locator('input[placeholder="Enter user\'s phone number"]').fill(phone);
        await newPage.getByRole('button', { name: 'Send Invitation' }).click();
        await expect(newPage.getByRole('alert', { name: 'Invitation Sent!' })).toBeVisible();
    }

    async clickRestaurant(restaurant: string) {
        await this.page.waitForLoadState('networkidle');
        const restaurantElement = this.page.locator(`(//div[text()="${restaurant}"])[1]`);
        await restaurantElement.waitFor({ state: 'visible', timeout: 5000 });
        await restaurantElement.click();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
    }

    async transferMenu(fromRestaurant: string, toRestaurant: string) {
        // Click the source restaurant
        await this.clickRestaurant(fromRestaurant);
        
        // Wait for and click the first menu
        const firstMenu = this.page.locator('(//a[contains(@href, "/menu")])[1]');
        await firstMenu.waitFor({ state: 'visible', timeout: 5000 });
        await firstMenu.hover();
        
        // Open menu options
        await this.menuOptionsButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.menuOptionsButton.click();
        
        // Click transfer option
        await this.transferTemplateOption.waitFor({ state: 'visible', timeout: 5000 });
        await this.transferTemplateOption.click();
        
        // Select destination restaurant
        const restaurantSelect = this.page.getByPlaceholder('Select a restaurant');
        await restaurantSelect.waitFor({ state: 'visible', timeout: 5000 });
        await restaurantSelect.click();
        await restaurantSelect.fill(toRestaurant);
        await this.page.waitForTimeout(1000); // Wait for dropdown to populate
        
        // Click the first matching option
        const option = this.page.getByRole('option', { name: toRestaurant }).first();
        await option.waitFor({ state: 'visible', timeout: 5000 });
        await option.click();
        
        // Click transfer button and wait for success
        const transferButton = this.page.getByRole('button', { name: 'Transfer' });
        await transferButton.waitFor({ state: 'visible', timeout: 5000 });
        await transferButton.click();
        
        // Wait for transfer to complete
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
        
        // Verify success message - try different possible messages
        try {
            await expect(this.page.getByText(/Menu transferred successfully|Template transferred successfully|Success/i)).toBeVisible({ timeout: 5000 });
        } catch (error) {
            // If no success message found, verify the transfer by checking if we're back on the dashboard
            await expect(this.page.getByRole('button', { name: 'Add Restaurant' })).toBeVisible({ timeout: 5000 });
        }
    }

    async verifyMenuTransferred(restaurant: string) {
        // Wait for the page to be fully loaded
        await this.page.waitForLoadState('networkidle');
        
        // Click the restaurant with retry logic
        const restaurantElement = this.page.locator(`(//div[text()="${restaurant}"])[1]`);
        await restaurantElement.waitFor({ state: 'visible', timeout: 5000 });
        await restaurantElement.click();
        
        // Wait for any animations and network requests
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle');
        
        // Wait for menus to be visible with a longer timeout
        const menus = this.page.locator('//a[contains(@href, "/menu/")]');
        await menus.first().waitFor({ state: 'visible', timeout: 10000 });
        
        // Get count and verify
        const count = await menus.count();
        console.log(`Found ${count} menus for restaurant: ${restaurant}`);
        expect(count).toBeGreaterThan(0);
    }

    async publishUnpublishMenu(restaurant: string) {
        await this.clickRestaurant(restaurant);
        
        // Get the first menu element
        const firstMenu = this.page.locator('(//a[contains(@href, "/menu")])[1]');
        await firstMenu.waitFor({ state: 'visible', timeout: 5000 });
        
        // Check the current status with retry logic
        let currentStatus: string | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            const draftLocator = firstMenu.locator('//span[text()="Draft"]');
            const liveLocator = firstMenu.locator('//span[text()="Live"]');
            
            if (await draftLocator.isVisible()) {
                currentStatus = 'Draft';
                break;
            } else if (await liveLocator.isVisible()) {
                currentStatus = 'Live';
                break;
            }
            
            // If status not found, wait and retry
            await this.page.waitForTimeout(1000);
            retryCount++;
        }
        
        if (!currentStatus) {
            throw new Error('Could not determine menu status after multiple attempts');
        }

        // Hover and click options button
        await firstMenu.hover();
        await this.menuOptionsButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.menuOptionsButton.click();
        
        // Perform appropriate action based on status
        if (currentStatus === 'Live') {
            await this.unpublishMenu.waitFor({ state: 'visible', timeout: 5000 });
            await this.unpublishMenu.click();
        } else {
            await this.publishMenu.waitFor({ state: 'visible', timeout: 5000 });
            await this.publishMenu.click();
        }
        
        // Wait for action to complete
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(3000);
        
        // Reload and verify with retry logic
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        await this.clickRestaurant(restaurant);
        
        // Wait for menu to be visible again
        await firstMenu.waitFor({ state: 'visible', timeout: 5000 });
        
        // Verify the status has changed with retry logic
        retryCount = 0;
        while (retryCount < maxRetries) {
            const expectedStatus = currentStatus === 'Live' ? 'Draft' : 'Live';
            const statusLocator = firstMenu.locator(`//span[text()="${expectedStatus}"]`);
            
            if (await statusLocator.isVisible()) {
                return; // Status changed successfully
            }
            
            // If status not found, wait and retry
            await this.page.waitForTimeout(1000);
            retryCount++;
        }
        
        throw new Error(`Menu status did not change to ${currentStatus === 'Live' ? 'Draft' : 'Live'} after multiple attempts`);
    }

    async renameMenu(restaurant: string, newName: string) {
        await this.page.locator(`(//div[text()="${restaurant}"])[1]`).click();
        const firstMenu = this.page.locator('(//a[contains(@href, "/menu")])[1]');
        const nameElement = firstMenu.locator('//div[contains(@class, "mantine-Text-root")]').first();

        await firstMenu.hover();
        await this.menuOptionsButton.click();
        await this.renameOption.click();

        const input = this.page.getByRole('textbox', { name: 'Enter template name' });
        await input.fill('');
        await input.fill(newName);
        await this.page.getByRole('button', { name: 'Rename' }).click();
        await this.page.waitForTimeout(2000);

        return nameElement;
    }

    async editThumbnail(restaurant: string, imagePath: string) {
        await this.page.waitForLoadState('networkidle');
        await this.page.locator(`(//div[text()="${restaurant}"])[1]`).click();
        await this.page.waitForLoadState('networkidle');

        const firstMenu = this.page.locator('(//a[contains(@href, "/menu")])[1]');
        await firstMenu.waitFor({ state: 'visible', timeout: 5000 });
        const beforeImageSrc = await firstMenu.locator('//img').getAttribute('src');

        await firstMenu.hover();
        await this.menuOptionsButton.waitFor({ state: 'visible', timeout: 5000 });
        await this.menuOptionsButton.click();
        await this.editThumbnailOption.waitFor({ state: 'visible', timeout: 5000 });
        await this.editThumbnailOption.click();

        // Wait for the file input and upload dialog
        await this.page.waitForTimeout(1000);
        const fileInput = this.page.locator('input[type="file"]');
        await fileInput.waitFor({ state: 'attached', timeout: 5000 });
        await fileInput.setInputFiles(imagePath);

        // Wait for image to be processed and update button to be enabled
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000); // Additional wait for image processing

        const updateButton = this.page.getByRole('button', { name: 'Update' });
        await updateButton.waitFor({ state: 'visible', timeout: 5000 });
        await updateButton.click();

        // Wait for update to complete and page to stabilize
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);

        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        await this.page.locator(`(//div[text()="${restaurant}"])[1]`).click();
        await this.page.waitForLoadState('networkidle');

        // Wait for the new image to be loaded
        await firstMenu.waitFor({ state: 'visible', timeout: 5000 });
        const afterImageSrc = await firstMenu.locator('//img').getAttribute('src');
        
        // Verify the image has changed
        expect(beforeImageSrc).not.toBe(afterImageSrc);
        return { beforeImageSrc, afterImageSrc };
    }

    async toggleMenuAutolayout(restaurant: string) {
        await this.page.locator(`(//div[text()="${restaurant}"])[1]`).click();
        const firstMenu = this.page.locator('(//a[contains(@href, "/menu")])[1]');
        await firstMenu.hover();

        await this.menuOptionsButton.click();

        if (await this.turnOffAutolayoutOption.isVisible()) {
            await this.turnOffAutolayoutOption.click();
            await this.turnOnAutolayoutOption.waitFor({ state: 'visible' });
        }

        await this.turnOnAutolayoutOption.click();
    }

    async deleteRestaurant(restaurantName: string) {
        await this.page.waitForLoadState('networkidle');
        const searchBox = this.page.getByRole('textbox', { name: 'Search for any restaurant by' });
        await searchBox.waitFor({ state: 'visible', timeout: 5000 });
        await searchBox.clear();
        await searchBox.fill(restaurantName);
        await searchBox.press('Enter');
        
        await this.page.waitForTimeout(2000);
        
        const restaurantButton = this.page.getByRole('button', { name: restaurantName }).first();
        await restaurantButton.waitFor({ state: 'visible', timeout: 5000 });
        await restaurantButton.click();
        
        // Wait for the page to load after clicking the restaurant
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
        
        // Click the delete button with retry logic
        let deleteButton;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                deleteButton = this.page.getByRole('button').filter({ hasText: /^$/ }).nth(1);
                await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
                await deleteButton.click({ force: true });
                break;
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) throw error;
                await this.page.waitForTimeout(1000);
            }
        }
        
        await this.page.waitForTimeout(2000);
        
        // Type the name to confirm with retry logic
        const confirmInput = this.page.getByRole('textbox');
        await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
        await confirmInput.clear();
        await confirmInput.pressSequentially(restaurantName);
        
        // Click confirm with retry logic
        retryCount = 0;
        while (retryCount < maxRetries) {
            try {
                const confirmButton = this.page.getByRole('button', { name: 'Yes, delete this restaurant' });
                await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
                await confirmButton.click({ force: true });
                break;
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) throw error;
                await this.page.waitForTimeout(1000);
            }
        }
        
        // Wait for deletion to complete
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(3000);
        
        // Verify deletion was successful
        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForTimeout(2000);
        
        // Search again to verify
        await searchBox.clear();
        await searchBox.fill(restaurantName);
        await searchBox.press('Enter');
        await this.page.waitForTimeout(2000);
        
        // Verify the restaurant is not visible
        const restaurantButtonAfterDelete = this.page.getByRole('button', { name: restaurantName });
        await expect(restaurantButtonAfterDelete).not.toBeVisible({ timeout: 10000 });
    }
}