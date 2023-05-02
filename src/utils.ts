import * as fs from "fs";
import {app, dialog, Rectangle} from "electron";
import path from "path";
import fetch from "cross-fetch";
import extract from "extract-zip";
import util from "util";
const streamPipeline = util.promisify(require("stream").pipeline);
export var firstRun: boolean;
export var contentPath: string;
export var transparency: boolean;
//utility functions that are used all over the codebase or just too obscure to be put in the file used in
export function addStyle(styleString: string) {
    const style = document.createElement("style");
    style.textContent = styleString;
    document.head.append(style);
}

export function addScript(scriptString: string) {
    var script = document.createElement("script");
    script.textContent = scriptString;
    document.body.append(script);
}

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkIfConfigIsBroken() {
    if ((await getConfig("0")) == "d") {
        console.log("Detected a corrupted config");
        setup();
        dialog.showErrorBox(
            "Oops, something went wrong.",
            "ArmCord has detected that your configuration file is corrupted, please restart the app and set your settings again. If this issue persists, report it on the support server/Github issues."
        );
    }
}

export function setup() {
    console.log("Setting up temporary ArmCord settings.");
    const defaults: Settings = {
        windowStyle: "default",
        channel: "stable",
        armcordCSP: true,
        minimizeToTray: true,
        automaticPatches: false,
        alternativePaste: false,
        mods: "none",
        performanceMode: "none",
        skipSplash: false,
        inviteWebsocket: true,
        startMinimized: false,
        dynamicIcon: false,
        disableAutogain: false,
        useLegacyCapturer: false,
        mobileMode: false,
        trayIcon: "default",
        doneSetup: false
    };
    setConfigBulk({
        ...defaults
    });
}

//Get the version value from the "package.json" file
export var packageVersion = require("../package.json").version;

export function getVersion() {
    return packageVersion;
}
export function getDisplayVersion() {
    //Checks if the app version # has 4 sections (3.1.0.0) instead of 3 (3.1.0) / Shitty way to check if Kernel Mod is installed
    if ((app.getVersion() == packageVersion) == false) {
        if ((app.getVersion() == process.versions.electron) == true) {
            return `Dev Build (${packageVersion})`;
        } else {
            return `${packageVersion} [Modified]`;
        }
    } else {
        return packageVersion;
    }
}
export async function injectJS(inject: string) {
    const js = await (await fetch(`${inject}`)).text();

    const el = document.createElement("script");

    el.appendChild(document.createTextNode(js));

    document.body.appendChild(el);
}
export async function injectElectronFlags() {
    //     MIT License

    // Copyright (c) 2022 GooseNest

    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:

    // The above copyright notice and this permission notice shall be included in all
    // copies or substantial portions of the Software.

    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    // SOFTWARE.
    const presets = {
        performance: `--enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --enable-hardware-overlays=single-fullscreen,single-on-top,underlay --enable-features=EnableDrDc,CanvasOopRasterization,BackForwardCache:TimeToLiveInBackForwardCacheInSeconds/300/should_ignore_blocklists/true/enable_same_site/true,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,UseSkiaRenderer,WebAssemblyLazyCompilation --disable-features=Vulkan --force_high_performance_gpu`, // Performance
        battery: "--enable-features=TurnOffStreamingMediaCachingOnBattery --force_low_power_gpu" // Known to have better battery life for Chromium?
    };
    switch (await getConfig("performanceMode")) {
        case "performance":
            console.log("Performance mode enabled");
            app.commandLine.appendSwitch(presets.performance);
            break;
        case "battery":
            console.log("Battery mode enabled");
            app.commandLine.appendSwitch(presets.battery);
            break;
        default:
            console.log("No performance modes set");
    }
    if ((await getConfig("windowStyle")) == "transparent" && process.platform === "win32") {
        import("@pyke/vibe").then((vibe) => {
            console.log("Transparent mode enabled");
            vibe.setup(app);
            transparency = true;
        });
    }
}
export async function setLang(language: string) {
    const langConfigFile = path.join(app.getPath("userData"), "/storage/") + "lang.json";
    if (!fs.existsSync(langConfigFile)) {
        fs.writeFileSync(langConfigFile, "{}", "utf-8");
    }
    let rawdata = fs.readFileSync(langConfigFile, "utf-8");
    let parsed = JSON.parse(rawdata);
    parsed["lang"] = language;
    let toSave = JSON.stringify(parsed, null, 4);
    fs.writeFileSync(langConfigFile, toSave, "utf-8");
}
var language: string;
export async function getLang(object: string) {
    if (language == undefined) {
        try {
            const userDataPath = app.getPath("userData");
            const storagePath = path.join(userDataPath, "/storage/");
            const langConfigFile = storagePath + "lang.json";
            let rawdata = fs.readFileSync(langConfigFile, "utf-8");
            let parsed = JSON.parse(rawdata);
            language = parsed["lang"];
        } catch (e) {
            console.log("Language config file doesn't exist. Fallback to English.");
            language = "en-US";
        }
    }
    if (language.length == 2) {
        language = language + "-" + language.toUpperCase();
    }
    var langPath = path.join(__dirname, "../", "/assets/lang/" + language + ".json");
    if (!fs.existsSync(langPath)) {
        langPath = path.join(__dirname, "../", "/assets/lang/en-US.json");
    }
    let rawdata = fs.readFileSync(langPath, "utf-8");
    let parsed = JSON.parse(rawdata);
    if (parsed[object] == undefined) {
        console.log(object + " is undefined in " + language);
        langPath = path.join(__dirname, "../", "/assets/lang/en-US.json");
        rawdata = fs.readFileSync(langPath, "utf-8");
        parsed = JSON.parse(rawdata);
        return parsed[object];
    } else {
        return parsed[object];
    }
}
export async function getLangName() {
    if (language == undefined) {
        try {
            const userDataPath = app.getPath("userData");
            const storagePath = path.join(userDataPath, "/storage/");
            const langConfigFile = storagePath + "lang.json";
            let rawdata = fs.readFileSync(langConfigFile, "utf-8");
            let parsed = JSON.parse(rawdata);
            language = parsed["lang"];
        } catch (e) {
            console.log("Language config file doesn't exist. Fallback to English.");
            language = "en-US";
        }
    }
    if (language.length == 2) {
        language = language + "-" + language.toUpperCase();
    }
    return language;
}
//ArmCord Window State manager
export interface WindowState {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
}
export async function setWindowState(object: WindowState) {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const saveFile = storagePath + "window.json";
    let toSave = JSON.stringify(object, null, 4);
    fs.writeFileSync(saveFile, toSave, "utf-8");
}
export async function getWindowState(object: string) {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const settingsFile = storagePath + "window.json";
    let rawdata = fs.readFileSync(settingsFile, "utf-8");
    let returndata = JSON.parse(rawdata);
    console.log(returndata);
    console.log("[Window state manager] " + returndata);
    return returndata[object];
}
//ArmCord Settings/Storage manager

export function checkForDataFolder() {
    const dataPath = path.join(path.dirname(app.getPath("exe")), "armcord-data");
    if (fs.existsSync(dataPath) && fs.statSync(dataPath).isDirectory()) {
        console.log("Found armcord-data folder. Running in portable mode.");
        app.setPath("userData", dataPath);
    }
}

export interface Settings {
    windowStyle: string;
    channel: string;
    armcordCSP: boolean;
    minimizeToTray: boolean;
    automaticPatches: boolean;
    alternativePaste: boolean;
    mods: string;
    dynamicIcon: boolean;
    mobileMode: boolean;
    skipSplash: boolean;
    performanceMode: string;
    startMinimized: boolean;
    useLegacyCapturer: boolean;
    inviteWebsocket: boolean;
    disableAutogain: boolean;
    trayIcon: string;
    doneSetup: boolean;
}
export function getConfigLocation() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    return storagePath + "settings.json";
}
export async function getConfig(object: string) {
    let rawdata = fs.readFileSync(getConfigLocation(), "utf-8");
    let returndata = JSON.parse(rawdata);
    console.log("[Config manager] " + object + ": " + returndata[object]);
    return returndata[object];
}
export async function setConfig(object: string, toSet: any) {
    let rawdata = fs.readFileSync(getConfigLocation(), "utf-8");
    let parsed = JSON.parse(rawdata);
    parsed[object] = toSet;
    let toSave = JSON.stringify(parsed, null, 4);
    fs.writeFileSync(getConfigLocation(), toSave, "utf-8");
}
export async function setConfigBulk(object: Settings) {
    let toSave = JSON.stringify(object, null, 4);
    fs.writeFileSync(getConfigLocation(), toSave, "utf-8");
}
export async function checkIfConfigExists() {
    const userDataPath = app.getPath("userData");
    const storagePath = path.join(userDataPath, "/storage/");
    const settingsFile = storagePath + "settings.json";

    if (!fs.existsSync(settingsFile)) {
        if (!fs.existsSync(storagePath)) {
            fs.mkdirSync(storagePath);
            console.log("Created missing storage folder");
        }
        console.log("First run of the ArmCord. Starting setup.");
        setup();
        firstRun = true;
    } else {
        if ((await getConfig("doneSetup")) == false) {
            console.log("First run of the ArmCord. Starting setup.");
            setup();
            firstRun = true;
        } else {
            console.log("ArmCord has been run before. Skipping setup.");
        }
    }
}

// Mods
async function updateModBundle() {
    if ((await getConfig("noBundleUpdates")) == undefined ?? false) {
        try {
            console.log("Downloading mod bundle");
            const distFolder = app.getPath("userData") + "/plugins/loader/dist/";
            while (!fs.existsSync(distFolder)) {
                //waiting
            }
            var name: string = await getConfig("mods");
            const clientMods = {
                vencord: "c",
                cordwood: "https://raw.githubusercontent.com/Cordwood/builds/master/index.js",
                shelter: "https://raw.githubusercontent.com/uwu/shelter-builds/main/shelter.js"
            };
            const clientModsCss = {
                vencord: "https://github.com/Vendicated/Vencord/releases/download/devbuild/browser.css",
                cordwood: "https://armcord.xyz/placeholder.css",
                shelter: "https://armcord.xyz/placeholder.css"
            };
            var bundle: string = await (await fetch(clientMods[name as keyof typeof clientMods])).text();
            fs.writeFileSync(distFolder + "bundle.js", bundle, "utf-8");
            var css: string = await (await fetch(clientModsCss[name as keyof typeof clientModsCss])).text();
            fs.writeFileSync(distFolder + "bundle.css", css, "utf-8");
        } catch (e) {
            console.log("[Mod loader] Failed to install mods");
            console.error(e);
            dialog.showErrorBox(
                "Oops, something went wrong.",
                "ArmCord couldn't install mods, please check if you have stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
            );
        }
    } else {
        console.log("[Mod loader] Skipping mod bundle update");
    }
}

export var modInstallState: string;
export async function installModLoader() {
    if ((await getConfig("mods")) == "none") {
        modInstallState = "none";
        fs.rmSync(app.getPath("userData") + "/plugins/loader", {recursive: true, force: true});
        import("./extensions/plugin");
        console.log("[Mod loader] Skipping");
    } else {
        const pluginFolder = app.getPath("userData") + "/plugins/";
        if (!fs.existsSync(pluginFolder + "loader") || !fs.existsSync(pluginFolder + "loader/dist/" + "bundle.css")) {
            try {
                fs.rmSync(app.getPath("userData") + "/plugins/loader", {recursive: true, force: true});
                modInstallState = "installing";
                var zipPath = app.getPath("temp") + "/" + "loader.zip";
                if (!fs.existsSync(pluginFolder)) {
                    fs.mkdirSync(pluginFolder);
                    console.log("[Mod loader] Created missing plugin folder");
                }
                var loaderZip = await fetch("https://armcord.xyz/loader.zip");
                if (!loaderZip.ok) throw new Error(`unexpected response ${loaderZip.statusText}`);
                await streamPipeline(loaderZip.body, fs.createWriteStream(zipPath));
                await extract(zipPath, {dir: path.join(app.getPath("userData"), "plugins")});
                modInstallState = "modDownload";
                updateModBundle();
                import("./extensions/plugin");
                modInstallState = "done";
            } catch (e) {
                console.log("[Mod loader] Failed to install modloader");
                console.error(e);
                dialog.showErrorBox(
                    "Oops, something went wrong.",
                    "ArmCord couldn't install internal mod loader, please check if you have stable internet connection and restart the app. If this issue persists, report it on the support server/Github issues."
                );
            }
        } else {
            modInstallState = "modDownload";
            updateModBundle();
            import("./extensions/plugin");
            modInstallState = "done";
        }
    }
}
