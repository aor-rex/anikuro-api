const fs = require('fs/promises');
const path = require('path');
const { existsSync } = require('fs');
const os = require('os');

function resolveBrowserRuntime() {
    let chromiumBinary = null;
    let chromium = null;
    let useServerlessChromium = false;

    if (String(process.env.USE_STEALTH).toLowerCase() === 'true') {
        try {
            const playwrightExtra = require('playwright-extra');
            const stealth = require('playwright-extra-plugin-stealth')();
            chromium = playwrightExtra.chromium;
            chromium.use(stealth);
            console.log('Using playwright-extra with stealth plugin (USE_STEALTH=true)');
        } catch (err) {
            console.warn('USE_STEALTH=true but playwright-extra or stealth plugin not installed; falling back to regular browser runtime');
        }
    }

    try {
        if (!chromium) {
            chromiumBinary = require('@sparticuz/chromium');
            chromium = require('playwright-core').chromium;
        }

        if (os.platform() === 'linux') {
            useServerlessChromium = true;
        } else {
            console.warn('⚠️ Detected non-Linux OS. Disabling @sparticuz/chromium for local dev.');
        }
    } catch (e) {
        if (!chromium) {
            try {
                chromium = require('playwright').chromium;
                console.warn('Falling back to full Playwright (probably running locally)');
            } catch (inner) {
                const error = new Error(
                    'Browser runtime is not installed. Set FLARESOLVERR_URL or reinstall the Playwright browser stack.'
                );
                error.cause = inner;
                throw error;
            }
        }
    }

    return { chromium, chromiumBinary, useServerlessChromium };
}

/**
 * Launches a Chromium browser with appropriate settings for the current environment.
 * Automatically supports both serverless and local development.
 */
async function launchBrowser() {
    const { chromium, chromiumBinary, useServerlessChromium } = resolveBrowserRuntime();
    const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-offline-sync',
        '--disable-sync',
        '--disable-translate',
        '--no-first-run',
        '--no-zygote'
    ];

    // Serverless-specific optimizations
    const serverlessArgs = [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-domain-reliability',
        '--disable-component-extensions-with-background-pages',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
    ];

    // Default headless behavior:
    // - in serverless environments we want headless=true unless explicitly overridden
    // - allow overriding with CHROME_HEADLESS env var ("true"/"false") for local testing
    const envHeadless = typeof process.env.CHROME_HEADLESS !== 'undefined'
        ? String(process.env.CHROME_HEADLESS).toLowerCase() === 'true'
        : null;

    const defaultHeadless = isServerless ? true : false;

    const launchOptions = {
        headless: envHeadless === null ? defaultHeadless : envHeadless,
        args: isServerless ? [...baseArgs, ...serverlessArgs] : baseArgs,
        // Reduced timeouts for serverless
        timeout: isServerless ? 30000 : 60000
    };

    // Add user agent
    launchOptions.args.push(
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    if (useServerlessChromium && chromiumBinary) {
        console.log('Using serverless Chromium binary');
        
        try {
            const executablePath = await chromiumBinary.executablePath();

            if (existsSync(executablePath)) {
                launchOptions.executablePath = executablePath;
                // Use chromium.args but merge with our custom args
                // Prepend serverless chromium recommended args so they run first
                launchOptions.args = [...chromiumBinary.args, ...launchOptions.args];
                
                console.log('Serverless Chromium configured successfully');
            } else {
                console.warn('⚠️ Chromium binary not found at expected path. Falling back to default.');
            }
        } catch (error) {
            console.error('Error setting up serverless Chromium:', error);
        }
    }

    console.log('Launching browser with headless=%s and args count=%d', launchOptions.headless, launchOptions.args.length);
    
    try {
        const browser = await chromium.launch(launchOptions);
        console.log('Browser launched successfully');
        return browser;
    } catch (error) {
        console.error('Failed to launch browser:', error);
        
        // Fallback with minimal args
        console.log('Attempting fallback launch with minimal configuration...');
        const fallbackOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        };
        
        if (useServerlessChromium && chromiumBinary) {
            try {
                fallbackOptions.executablePath = await chromiumBinary.executablePath();
            } catch (e) {
                console.warn('Could not set executable path for fallback');
            }
        }
        
        return await chromium.launch(fallbackOptions);
    }
}

module.exports = { launchBrowser };
