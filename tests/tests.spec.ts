import { test, expect } from "../tests/fixtures/fixture";

// test("Login with phone", async ({ page }) => {
//   await page.goto("http://localhost:3000/templates");
//   await page.getByRole("textbox", { name: "Enter your phone number" }).click();
//   await page
//     .locator(".PhoneInputInput")
//     .first()
//     .fill(`1208568${getRandomChar("0123456789")}`);
//   const [response] = await Promise.all([
//     page.waitForEvent(
//       "response",
//       (response) =>
//         response.url().includes("/auth/v1/otp") && response.status() === 200
//     ),
//     page.locator(".loginWithPhoneButton").first().click(),
//   ]);
//   expect(response.status()).toBe(200);
// });

// test("Login with email", async ({ page }) => {
//   await page.goto("http://localhost:3000/templates");
//   await page.getByRole("button", { name: "Log in with Email" }).click();
//   await page.getByRole("textbox", { name: "Email address" }).click();
//   await page
//     .getByRole("textbox", { name: "Email address" })
//     .fill(
//       `test${getRandomChar("abcdefghijklmnopqrstuvwxyz0123456789")}@email.com`
//     );
//   const [response] = await Promise.all([
//     page.waitForEvent(
//       "response",
//       (response) =>
//         response
//           .url()
//           .includes("/auth/v1/otp?redirect_to=http%3A%2F%2Flocalhost%3A3000") &&
//         response.status() === 200
//     ),
//     page.locator(".loginWithEmailButton").first().click(),
//   ]);
//   expect(response.status()).toBe(200);
// });

// test("Create menu", async ({ page }) => {
//   await page.goto("http://localhost:3000/template");
//   await expect(page.locator(".loginWithEmailButton").first()).toBeVisible();
// });

// function getRandomChar(inputString: string): string | null {
//   const digits = inputString.match(/\d/g);

//   // Check if there are enough digits to form a four-digit string
//   if (digits && digits.length >= 4) {
//     const randomIndices: any = [];
//     const resultDigits = [];

//     // Generate four unique random indices
//     while (randomIndices.length < 4) {
//       const randomIndex = Math.floor(Math.random() * digits.length);

//       // Ensure the generated index is unique
//       if (!randomIndices.includes(randomIndex)) {
//         randomIndices.push(randomIndex);
//       }
//     }

//     // Retrieve the characters at the random indices
//     for (const index of randomIndices) {
//       resultDigits.push(digits[index]);
//     }

//     // Combine the digits to form a four-digit string
//     return resultDigits.join("");
//   }

//   // Return null if there are not enough digits
//   return null;
// }

test.describe("Suites @regression", async () => {
  const imagePath = "tests/data/example.jpg";

  test.beforeEach("Visiting the url", async ({ page, settings }) => {
    await page.goto(settings.baseUrl);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach("teardown", async ({ page, context }) => {
    // Close all pages
    const pages = context.pages();
    for (const p of pages) {
      if (!p.isClosed()) await p.close().catch(() => {});
    }
  });

  // test("Clean up existing Automation Restaurant", async ({ page, settings }) => {
  //   await page.goto(settings.baseUrl);
  //   await page.waitForLoadState('networkidle');

  //   const searchBox = page.getByRole("textbox", {
  //     name: "Search for any restaurant by",
  //   });

  //   // Keep deleting until no such restaurant appears
  //   while (true) {
  //     await page.reload();
  //     await page.waitForLoadState('networkidle');
  //     await searchBox.waitFor({ state: 'visible', timeout: 5000 });
  //     await searchBox.fill("Automation Restaurant");
  //     await searchBox.press("Enter");
  //     await page.waitForTimeout(2000); // Wait for results to load

  //     const restaurantButtons = await page
  //       .getByRole("button", { name: "Automation Restaurant" })
  //       .all();

  //     if (restaurantButtons.length === 0) {
  //       break; // No more restaurants to delete
  //     }

  //     // Loop through all found entries
  //     for (const button of restaurantButtons) {
  //       await button.waitFor({ state: 'visible', timeout: 5000 });
  //       await button.first().click(); // Open restaurant
  //       await page.waitForLoadState('networkidle');

  //       // Click delete icon (assuming second blank button)
  //       const deleteButton = page.getByRole('button').filter({ hasText: /^$/ }).nth(1);
  //       await deleteButton.waitFor({ state: 'visible', timeout: 5000 });
  //       await deleteButton.click();

  //       await page.waitForTimeout(1000);

  //       // Type the name to confirm
  //       const confirmInput = page.getByRole("textbox");
  //       await confirmInput.waitFor({ state: 'visible', timeout: 5000 });
  //       await confirmInput.pressSequentially("Automation Restaurant");

  //       // Confirm deletion
  //       const confirmButton = page.getByRole("button", { name: "Yes, delete this restaurant" });
  //       await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
  //       await confirmButton.click();

  //       await page.waitForLoadState('networkidle');
  //     }
  //   }
  // });

  test(
    "Clean up existing Automation Restaurant",
    async ({ page }) => {

      const searchBox = page.getByRole("textbox", {
        name: "Search for any restaurant by",
      });

      // Keep deleting until no such restaurant appears
      while (true) {
        await page.reload();
        await searchBox.fill("Automation Restaurant");
        await searchBox.press("Enter");
        await page.waitForTimeout(1000); // Wait for results to load

        const restaurantButtons = await page
          .getByRole("button", { name: "Automation Restaurant" })
          .all();

        if (restaurantButtons.length === 0) {
          break; // No more restaurants to delete
        }

        // Loop through all found entries
        for (const button of restaurantButtons) {
          await button.first().click(); // Open restaurant

          // Click delete icon (assuming second blank button)
         await page
        .getByRole('button').filter({ hasText: /^$/ }).nth(1)
        .click();

          await page.waitForTimeout(1000);

          // Type the name to confirm
          await page
            .getByRole("textbox")
            .pressSequentially("Automation Restaurant");

          await page.waitForTimeout(2000);
          // Confirm deletion
          await page.getByRole('button', { name: 'Yes, delete this restaurant' }).click({ force: true});

          // Optional: wait for deletion to finish before next loop
          await page.waitForTimeout(1000);
        }
      }
    }
  );

  test("Milestone 1: Successful login with Email and Logout", async ({
    page,
    dashboardPage,
  }) => {
    await test.step("Login and Logout", async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await dashboardPage.logout();
    });
  });

  test("Milestone 1: Create New Menu Button", async ({ dashboardPage }) => {
    await test.step("Create New Menu", async () => {
      await dashboardPage.page.waitForLoadState('networkidle');
      const filePath = await dashboardPage.createNewMenu("Test", "Test", "Demo Restaurant");
      
      // Verify download was successful
      const fs = require('fs');
      expect(fs.existsSync(filePath)).toBeTruthy();
      
      // Verify file is not empty
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);
      
      // Clean up after test
      fs.unlinkSync(filePath);
    });
  });

  test("Milestone 2: Dashboard Functionalities - Add restaurant", async ({
    dashboardPage,
  }) => {
    await dashboardPage.gotoDashboard();
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.addRestaurant({
      name: "Automation Restaurant",
      location: "NYC",
      description: "Testing",
      street: "New Street",
      city: "NYC",
      state: "NY",
      zipCode: "12345",
    });
  });

  test("Milestone 2: Dashboard Functionalities - Add user", async ({
    dashboardPage,
  }) => {
    await dashboardPage.gotoDashboard();
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.addUser({
      phone: "1 (234) 232-1333",
      email: "flapJackAutomation1@yopmail.com",
      restaurant: "Automation Restaurant",
    });
  });

  test("Milestone 2: Dashboard Functionalities - Search user", async ({
    dashboardPage,
  }) => {
    await dashboardPage.gotoDashboard();
    await dashboardPage.page.waitForLoadState('networkidle');
    const emailCell = await dashboardPage.searchUser(
      "flapJackAutomation1@yopmail.com"
    );
    await expect(emailCell).toHaveText("flapjackautomation1@yopmail.com");
  });

  test("Milestone 2: Dashboard Functionalities - Update user", async ({
    dashboardPage,
  }) => {
    await dashboardPage.gotoDashboard();
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.updateUserRole(
      "flapJackAutomation1@yopmail.com",
      "owner"
    );
    await expect(
      dashboardPage.page.getByText("User not allowed")
    ).toBeVisible();
  });

  test("Milestone 2: Dashboard Functionalities - Delete user", async ({
    page,
    dashboardPage
  }) => {
    await dashboardPage.gotoDashboard();
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.deleteUser("flapJackAutomation1@yopmail.com");
  });

  test("Milestone 2: Dashboard Functionalities - Navigate to homepage", async ({
    dashboardPage,
  }) => {
    await dashboardPage.navigateToHomepage();
    await dashboardPage.page.waitForLoadState('networkidle');
  });

  test("Milestone 2: Dashboard Functionalities - Invite user via dashboard icon", async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.inviteUserFromDashboard(
      "Automation Restaurant",
      "1 (234) 232-1333"
    );
  });

  test("Milestone 2: Menu Options - Transfer restaurant", async ({
    dashboardPage,
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.transferMenu("Dev Restaurant", "Automation Restaurant");
    await dashboardPage.page.reload();
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.verifyMenuTransferred("Automation Restaurant");
  });

  test("Milestone 2: Menu Options - Publish/unpublish menu", async ({
    page,
    dashboardPage
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.publishUnpublishMenu("Automation Restaurant");
  });

  test("Milestone 2: Menu Options - Rename template", async ({
    dashboardPage,
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    const nameElement = await dashboardPage.renameMenu(
      "Automation Restaurant",
      "test 1"
    );
    const updatedName = (await nameElement.textContent())?.trim();
    expect(updatedName).toBe("test 1");
  });

  test("Milestone 2: Menu Options - Edit thumbnail", async ({
    dashboardPage,
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    const { beforeImageSrc, afterImageSrc } = await dashboardPage.editThumbnail(
      "Automation Restaurant",
      imagePath
    );
    expect(beforeImageSrc).not.toBe(afterImageSrc);
  });

  test("Milestone 2: Menu Options - Edit menu & Auto/Non-Auto layout", async ({
    dashboardPage,
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.toggleMenuAutolayout("Automation Restaurant");
    await dashboardPage.editTemplateOption.waitFor({ state: 'visible', timeout: 5000 });
    await dashboardPage.editTemplateOption.click();
    await dashboardPage.page.waitForTimeout(2000);

    // Wait for and verify each button
    const buttons = ['Content', 'Layout', 'Style', 'Images', 'Text', 'Shapes'];
    for (const buttonName of buttons) {
      const button = dashboardPage.page.getByRole("button", { name: buttonName });
      await button.waitFor({ state: 'visible', timeout: 5000 });
      await expect(button).toBeVisible();
    }
  });

  test("Milestone 2: Menu Options - Delete restaurant", async ({
    dashboardPage,
  }) => {
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.deleteRestaurant("Automation Restaurant");
    
    // Wait for deletion to complete
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.page.waitForTimeout(2000);
    
    // Reload the page to ensure fresh state
    await dashboardPage.page.reload();
    await dashboardPage.page.waitForLoadState('networkidle');
    await dashboardPage.page.waitForTimeout(2000);

    // Clear and search for the restaurant
    const searchBox = dashboardPage.page.getByRole("textbox", { name: "Search for any restaurant by" });
    await searchBox.waitFor({ state: 'visible', timeout: 5000 });
    await searchBox.clear();
    await searchBox.fill("Automation Restaurant");
    await searchBox.press("Enter");
    
    // Wait for search results
    await dashboardPage.page.waitForTimeout(2000);
    
    // Verify the restaurant is not visible
    const restaurantButton = dashboardPage.page.getByRole("button", { name: "Automation Restaurant" });
    await expect(restaurantButton).not.toBeVisible({ timeout: 10000 });
  });
});