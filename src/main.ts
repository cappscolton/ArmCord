// Modules to control application life and create native browser window
import {app, BrowserWindow, session, dialog} from "electron";
import "v8-compile-cache";
import {getConfig, setup, checkIfConfigExists} from "./utils";
import "./extensions/mods";
import "./extensions/plugin";
import "./tray";
import {createCustomWindow, createNativeWindow, createTabsHost} from "./window";
import "./shortcuts";

export var settings: any;
export var customTitlebar: boolean;
export var tabs: boolean;

if (process.platform == "linux") {
    if (process.env.$XDG_SESSION_TYPE == "wayland") {
        console.log("Wayland specific patches applied.")
        app.commandLine.appendSwitch("ozone-platform=wayland");
        if (process.env.$XDG_CURRENT_DESKTOP == "GNOME") {
            app.commandLine.appendSwitch("enable-features=UseOzonePlatform,WaylandWindowDecorations");
        } else {
            app.commandLine.appendSwitch("enable-features=UseOzonePlatform");
        }
    }
}
checkIfConfigExists();

app.whenReady().then(async () => {
    switch (await getConfig("windowStyle")) {
        case "default":
            createCustomWindow();
            customTitlebar = true;
            break;
        case "native":
            createNativeWindow();
            break;
        case "discord":
            createNativeWindow();
            break;
        case "glasstron":
            dialog.showErrorBox(
                "Glasstron is unsupported.",
                "This build doesn't include Glasstron functionality, please edit windowStyle value in your settings.json to something different (default for example)"
            );
            app.quit();
            break;
        case "tabs":
            createTabsHost();
            tabs = true;
            break;
        default:
            createCustomWindow();
            customTitlebar = true;
            break;
    }
    session.fromPartition("some-partition").setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === "notifications") {
            // Approves the permissions request
            callback(true);
        }
        if (permission === "media") {
            // Approves the permissions request
            callback(true);
        }
    });
    app.on("activate", async function () {
        if (BrowserWindow.getAllWindows().length === 0)
            switch (await getConfig("windowStyle")) {
                case "default":
                    createCustomWindow();
                    break;
                case "native":
                    createNativeWindow();
                    break;
                case "glasstron":
                    dialog.showErrorBox(
                        "Glasstron is unsupported.",
                        "This build doesn't include Glasstron functionality, please edit windowStyle value in your settings.json to something different (default for example)"
                    );
                    app.quit();
                    break;
                case "tabs":
                    createTabsHost();
                    tabs = true;
                    break;
                default:
                    createCustomWindow();
                    break;
            }
    });
});

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});
