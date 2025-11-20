# How to Push Your Code to GitHub from Replit

## Quick Guide

Replit provides two ways to push your code to GitHub:

### Option 1: Using the Git Pane (Recommended - Visual Interface)

1. **Open the Git Pane**
   - Look for the Git icon in the Tools section of your Replit workspace
   - Click on it to open the visual Git interface

2. **Review Your Changes**
   - The Git pane will show all modified, added, and deleted files
   - Review the changes to make sure everything looks correct

3. **Stage Your Changes**
   - Select the files you want to include in your commit
   - You can select individual files or stage all changes at once

4. **Commit Your Changes**
   - Enter a descriptive commit message, for example:
     - "Add hybrid client/server PSD processing with smart routing"
     - "Implement server-side processing for large PSD files (>50MB)"
   - Click the "Commit" button

5. **Push to GitHub**
   - After committing, click the "Push" button
   - Your changes will be uploaded to GitHub

### Option 2: Using the Command Line

If you prefer using Git commands directly, open the Shell tool and run:

```bash
# Stage all changes
git add .

# Commit with a message
git commit -m "Add hybrid client/server PSD processing"

# Push to GitHub
git push origin main
```

**Note:** Replace `main` with your branch name if you're working on a different branch.

### For Private Repositories

If you're pushing to a private repository, you may need to authenticate:

1. Create a Personal Access Token (PAT) in GitHub:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate a new token with `repo` scope
   
2. Store the token in Replit Secrets:
   - Open the Secrets tool in Replit
   - Add a new secret called `GIT_URL`
   - Set the value to: `https://YOUR_TOKEN@github.com/YOUR_USERNAME/YOUR_REPO.git`

3. Push using:
   ```bash
   git push $GIT_URL
   ```

## What Was Just Implemented

Your Flapjack application now has **hybrid client/server PSD processing** with these new features:

### Smart Processing Router
- **Small files (<50MB)**: Processed instantly in the browser for immediate feedback
- **Large files (>50MB)**: Automatically routed to server-side processing using @cesdk/node
- **Intelligent detection**: The system automatically chooses the best processor based on total file size

### New Files Added
1. `pages/api/import/process-psd-server.ts` - Server-side API route for processing large PSD files
2. `helpers/base64Utils.ts` - Utility functions for converting between base64 and Blob formats

### Modified Files
1. `components/PSDImport/PSDImportZone.tsx` - Enhanced with smart routing logic
2. `replit.md` - Updated documentation with latest changes
3. `package.json` - Added @cesdk/node and pngjs dependencies

### Key Benefits
- **Better performance**: Large files no longer crash the browser
- **Handles up to 900MB**: Server can process files that would be impossible client-side
- **Partial success handling**: If some files fail, the successful ones still get processed
- **User feedback**: Clear warnings when files fail with specific error messages

## Suggested Commit Message

```
feat: Add hybrid client/server PSD processing with smart routing

- Implement server-side PSD processing API using @cesdk/node
- Add automatic routing based on file size (50MB threshold)
- Support files up to 900MB via server-side processing
- Add partial success handling with detailed error reporting
- Create base64 conversion utilities for server/client communication
- Enhance user feedback with processing status indicators

Benefits:
- Prevents browser crashes on large files
- Better performance and reliability
- Maintains order preservation in multi-PSD imports
```

## Next Steps

After pushing to GitHub:

1. **Verify the push**: Check your GitHub repository to ensure all files were uploaded
2. **Review the diff**: Look at the changes in GitHub to confirm everything is correct
3. **Test deployment**: Consider deploying your updated application
4. **Monitor**: Keep an eye on server logs for any PSD processing errors in production

---

Happy coding! 🚀
