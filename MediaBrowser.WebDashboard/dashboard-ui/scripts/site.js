function getWindowLocationSearch(win) {
    "use strict";
    var search = (win || window).location.search;
    if (!search) {
        var index = window.location.href.indexOf("?");
        index != -1 && (search = window.location.href.substring(index))
    }
    return search || ""
}

function getParameterByName(name, url) {
    "use strict";
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)",
        regex = new RegExp(regexS, "i"),
        results = regex.exec(url || getWindowLocationSearch());
    return null == results ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}

function pageClassOn(eventName, className, fn) {
    "use strict";
    document.addEventListener(eventName, function (e) {
        var target = e.target;
        target.classList.contains(className) && fn.call(target, e)
    })
}

function pageIdOn(eventName, id, fn) {
    "use strict";
    document.addEventListener(eventName, function (e) {
        var target = e.target;
        target.id == id && fn.call(target, e)
    })
}
var Dashboard = {
        isConnectMode: function () {
            if (AppInfo.isNativeApp) return !0;
            var url = window.location.href.toLowerCase();
            return url.indexOf("mediabrowser.tv") != -1 || url.indexOf("emby.media") != -1
        },
        isRunningInCordova: function () {
            return "cordova" == window.appMode
        },
        onRequestFail: function (e, data) {
            if (401 == data.status && "ParentalControl" == data.errorCode) {
                var currentView = ViewManager.currentView();
                currentView && !currentView.classList.contains(".standalonePage") && Dashboard.alert({
                    message: Globalize.translate("MessageLoggedOutParentalControl"),
                    callback: function () {
                        Dashboard.logout(!1)
                    }
                })
            }
        },
        getCurrentUser: function () {
            return window.ApiClient.getCurrentUser()
        },
        serverAddress: function () {
            if (Dashboard.isConnectMode()) {
                var apiClient = window.ApiClient;
                return apiClient ? apiClient.serverAddress() : null
            }
            var urlLower = window.location.href.toLowerCase(),
                index = urlLower.lastIndexOf("/web");
            if (index != -1) return urlLower.substring(0, index);
            var loc = window.location,
                address = loc.protocol + "//" + loc.hostname;
            return loc.port && (address += ":" + loc.port), address
        },
        getCurrentUserId: function () {
            var apiClient = window.ApiClient;
            return apiClient ? apiClient.getCurrentUserId() : null
        },
        onServerChanged: function (userId, accessToken, apiClient) {
            apiClient = apiClient || window.ApiClient, window.ApiClient = apiClient
        },
        logout: function (logoutWithServer) {
            function onLogoutDone() {
                var loginPage;
                Dashboard.isConnectMode() ? (loginPage = "connectlogin.html", window.ApiClient = null) : loginPage = "login.html", Dashboard.navigate(loginPage)
            }
            logoutWithServer === !1 ? onLogoutDone() : ConnectionManager.logout().then(onLogoutDone)
        },
        getConfigurationPageUrl: function (name) {
            return "configurationpage?name=" + encodeURIComponent(name)
        },
        navigate: function (url, preserveQueryString) {
            if (!url) throw new Error("url cannot be null or empty");
            var queryString = getWindowLocationSearch();
            return preserveQueryString && queryString && (url += queryString), Emby.Page.show(url)
        },
        showLoadingMsg: function () {
            Dashboard.loadingVisible = !0, require(["loading"], function (loading) {
                Dashboard.loadingVisible ? loading.show() : loading.hide()
            })
        },
        hideLoadingMsg: function () {
            Dashboard.loadingVisible = !1, require(["loading"], function (loading) {
                Dashboard.loadingVisible ? loading.show() : loading.hide()
            })
        },
        processPluginConfigurationUpdateResult: function () {
            Dashboard.hideLoadingMsg(), require(["toast"], function (toast) {
                toast(Globalize.translate("MessageSettingsSaved"))
            })
        },
        processServerConfigurationUpdateResult: function (result) {
            Dashboard.hideLoadingMsg(), require(["toast"], function (toast) {
                toast(Globalize.translate("MessageSettingsSaved"))
            })
        },
        processErrorResponse: function (response) {
            Dashboard.hideLoadingMsg();
            var status = "" + response.status;
            response.statusText && (status = response.statusText), Dashboard.alert({
                title: status,
                message: response.headers ? response.headers.get("X-Application-Error-Code") : null
            })
        },
        alert: function (options) {
            return "string" == typeof options ? void require(["toast"], function (toast) {
                toast({
                    text: options
                })
            }) : void require(["alert"], function (alert) {
                alert({
                    title: options.title || Globalize.translate("HeaderAlert"),
                    text: options.message
                }).then(options.callback || function () {})
            })
        },
        restartServer: function () {
            var apiClient = window.ApiClient;
            apiClient && (Dashboard.suppressAjaxErrors = !0, Dashboard.showLoadingMsg(), apiClient.restartServer().then(function () {
                setTimeout(function () {
                    Dashboard.reloadPageWhenServerAvailable()
                }, 250)
            }, function () {
                Dashboard.suppressAjaxErrors = !1
            }))
        },
        reloadPageWhenServerAvailable: function (retryCount) {
            var apiClient = window.ApiClient;
            apiClient && apiClient.getJSON(apiClient.getUrl("System/Info")).then(function (info) {
                info.HasPendingRestart ? Dashboard.retryReload(retryCount) : window.location.reload(!0)
            }, function () {
                Dashboard.retryReload(retryCount)
            })
        },
        retryReload: function (retryCount) {
            setTimeout(function () {
                retryCount = retryCount || 0, retryCount++, retryCount < 10 ? Dashboard.reloadPageWhenServerAvailable(retryCount) : Dashboard.suppressAjaxErrors = !1
            }, 500)
        },
        showUserFlyout: function () {
            Dashboard.navigate("mypreferencesmenu.html")
        },
        getPluginSecurityInfo: function () {
            var apiClient = window.ApiClient;
            if (!apiClient) return Promise.reject();
            var cachedInfo = Dashboard.pluginSecurityInfo;
            return cachedInfo ? Promise.resolve(cachedInfo) : apiClient.ajax({
                type: "GET",
                url: apiClient.getUrl("Plugins/SecurityInfo"),
                dataType: "json",
                error: function () {}
            }).then(function (result) {
                return Dashboard.pluginSecurityInfo = result, result
            })
        },
        resetPluginSecurityInfo: function () {
            Dashboard.pluginSecurityInfo = null
        },
        ensureHeader: function (page) {
            page.classList.contains("standalonePage") && !page.classList.contains("noHeaderPage") && Dashboard.renderHeader(page)
        },
        renderHeader: function (page) {
            var header = page.querySelector(".header");
            if (!header) {
                var headerHtml = "";
                headerHtml += '<div class="header">', headerHtml += '<a class="logo" href="home.html" style="text-decoration:none;font-size: 22px;">', page.classList.contains("standalonePage") && (headerHtml += "b" === page.getAttribute("data-theme") ? '<img class="imgLogoIcon" src="css/images/logo.png" />' : '<img class="imgLogoIcon" src="css/images/logoblack.png" />'), headerHtml += "</a>", headerHtml += "</div>", page.insertAdjacentHTML("afterbegin", headerHtml)
            }
        },
        getToolsLinkHtml: function (item) {
            var menuHtml = "",
                pageIds = item.pageIds ? item.pageIds.join(",") : "";
            return pageIds = pageIds ? ' data-pageids="' + pageIds + '"' : "", menuHtml += '<a class="sidebarLink" href="' + item.href + '"' + pageIds + ">", item.icon && (menuHtml += '<i class="md-icon sidebarLinkIcon">' + item.icon + "</i>"), menuHtml += '<span class="sidebarLinkText">', menuHtml += item.name, menuHtml += "</span>", menuHtml += "</a>"
        },
        getToolsMenuHtml: function (page) {
            var i, length, item, items = Dashboard.getToolsMenuLinks(page),
                menuHtml = "";
            for (menuHtml += '<div class="drawerContent">', i = 0, length = items.length; i < length; i++) item = items[i], item.divider && (menuHtml += "<div class='sidebarDivider'></div>"), item.href ? menuHtml += Dashboard.getToolsLinkHtml(item) : (menuHtml += '<div class="sidebarHeader">', menuHtml += item.name, menuHtml += "</div>");
            return menuHtml += "</div>"
        },
        getToolsMenuLinks: function () {
            return [{
                name: Globalize.translate("TabServer")
            }, {
                name: Globalize.translate("TabDashboard"),
                href: "dashboard.html",
                pageIds: ["dashboardPage"],
                icon: "dashboard"
            }, {
                name: Globalize.translate("TabSettings"),
                href: "dashboardgeneral.html",
                pageIds: ["dashboardGeneralPage"],
                icon: "settings"
            }, {
                name: Globalize.translate("TabDevices"),
                href: "devices.html",
                pageIds: ["devicesPage", "devicePage", "devicesUploadPage"],
                icon: "tablet"
            }, {
                name: Globalize.translate("TabUsers"),
                href: "userprofiles.html",
                pageIds: ["userProfilesPage", "newUserPage", "editUserPage", "userLibraryAccessPage", "userParentalControlPage", "userPasswordPage"],
                icon: "people"
            }, {
                name: "Emby Premiere",
                href: "supporterkey.html",
                pageIds: ["supporterKeyPage"],
                icon: "star"
            }, {
                divider: !0,
                name: Globalize.translate("TabLibrary"),
                href: "library.html",
                pageIds: ["mediaLibraryPage", "librarySettingsPage", "libraryDisplayPage", "metadataImagesConfigurationPage", "metadataNfoPage"],
                icon: "folder",
                color: "#38c"
            }, {
                name: Globalize.translate("TabSubtitles"),
                href: "metadatasubtitles.html",
                pageIds: ["metadataSubtitlesPage"],
                icon: "closed_caption"
            }, {
                name: Globalize.translate("TabPlayback"),
                icon: "play_circle_filled",
                color: "#E5342E",
                href: "cinemamodeconfiguration.html",
                pageIds: ["cinemaModeConfigurationPage", "playbackConfigurationPage", "streamingSettingsPage"]
            }, {
                name: Globalize.translate("TabSync"),
                icon: "sync",
                href: "syncactivity.html",
                pageIds: ["syncActivityPage", "syncJobPage", "syncSettingsPage"],
                color: "#009688"
            }, {
                name: Globalize.translate("TabTranscoding"),
                icon: "transform",
                href: "encodingsettings.html",
                pageIds: ["encodingSettingsPage"]
            }, {
                divider: !0,
                name: Globalize.translate("TabExtras")
            }, {
                name: Globalize.translate("TabAutoOrganize"),
                color: "#01C0DD",
                href: "autoorganizelog.html",
                pageIds: ["libraryFileOrganizerPage", "libraryFileOrganizerSmartMatchPage", "libraryFileOrganizerLogPage"],
                icon: "folder"
            }, {
                name: Globalize.translate("DLNA"),
                href: "dlnasettings.html",
                pageIds: ["dlnaSettingsPage", "dlnaProfilesPage", "dlnaProfilePage"],
                icon: "settings"
            }, {
                name: Globalize.translate("TabLiveTV"),
                href: "livetvstatus.html",
                pageIds: ["liveTvStatusPage", "liveTvSettingsPage", "liveTvTunerProviderHdHomerunPage", "liveTvTunerProviderM3UPage", "liveTvTunerProviderSatPage"],
                icon: "dvr"
            }, {
                name: Globalize.translate("TabNotifications"),
                icon: "notifications",
                color: "brown",
                href: "notificationsettings.html",
                pageIds: ["notificationSettingsPage", "notificationSettingPage"]
            }, {
                name: Globalize.translate("TabPlugins"),
                icon: "add_shopping_cart",
                color: "#9D22B1",
                href: "plugins.html",
                pageIds: ["pluginsPage", "pluginCatalogPage"]
            }, {
                divider: !0,
                name: Globalize.translate("TabExpert")
            }, {
                name: Globalize.translate("TabAdvanced"),
                icon: "settings",
                href: "dashboardhosting.html",
                color: "#F16834",
                pageIds: ["dashboardHostingPage", "serverSecurityPage"]
            }, {
                name: Globalize.translate("TabLogs"),
                href: "log.html",
                pageIds: ["logPage"],
                icon: "folder_open"
            }, {
                name: Globalize.translate("TabScheduledTasks"),
                href: "scheduledtasks.html",
                pageIds: ["scheduledTasksPage", "scheduledTaskPage"],
                icon: "schedule"
            }, {
                name: Globalize.translate("MetadataManager"),
                href: "edititemmetadata.html",
                pageIds: [],
                icon: "mode_edit"
            }, {
                name: Globalize.translate("ButtonReports"),
                href: "reports.html",
                pageIds: [],
                icon: "insert_chart"
            }]
        },
        getSupportedRemoteCommands: function () {
            return ["GoHome", "GoToSettings", "VolumeUp", "VolumeDown", "Mute", "Unmute", "ToggleMute", "SetVolume", "SetAudioStreamIndex", "SetSubtitleStreamIndex", "DisplayContent", "GoToSearch", "DisplayMessage", "SetRepeatMode"]
        },
        capabilities: function () {
            var caps = {
                PlayableMediaTypes: ["Audio", "Video"],
                SupportedCommands: Dashboard.getSupportedRemoteCommands(),
                SupportsPersistentIdentifier: Dashboard.isRunningInCordova(),
                SupportsMediaControl: !0,
                SupportedLiveMediaTypes: ["Audio", "Video"]
            };
            return Dashboard.isRunningInCordova() && !browserInfo.safari && (caps.SupportsSync = !0, caps.SupportsContentUploading = !0), caps
        },
        normalizeImageOptions: function (options) {
            var setQuality;
            if (options.maxWidth && (setQuality = !0), options.width && (setQuality = !0), options.maxHeight && (setQuality = !0), options.height && (setQuality = !0), setQuality) {
                var quality = 90,
                    isBackdrop = "backdrop" == (options.type || "").toLowerCase();
                isBackdrop && (quality -= 10), browserInfo.slow && (quality -= 40), AppInfo.hasLowImageBandwidth && !isBackdrop && (quality -= 10), options.quality = quality
            }
        }
    },
    AppInfo = {};
! function () {
    "use strict";

    function setAppInfo() {
        var isCordova = Dashboard.isRunningInCordova();
        AppInfo.enableAutoSave = browserInfo.touch, AppInfo.enableAppStorePolicy = isCordova, browserInfo.iOS && (AppInfo.hasLowImageBandwidth = !0), isCordova ? (AppInfo.isNativeApp = !0, browserInfo.android && (AppInfo.supportsExternalPlayers = !0)) : AppInfo.enableSupporterMembership = !0, AppInfo.supportsFileInput = !(AppInfo.isNativeApp && browserInfo.android), AppInfo.supportsUserDisplayLanguageSetting = Dashboard.isConnectMode()
    }

    function initializeApiClient(apiClient) {
        AppInfo.enableAppStorePolicy && (apiClient.getAvailablePlugins = function () {
            return Promise.resolve([])
        }, apiClient.getInstalledPlugins = function () {
            return Promise.resolve([])
        }), apiClient.normalizeImageOptions = Dashboard.normalizeImageOptions, Events.off(apiClient, "requestfail", Dashboard.onRequestFail), Events.on(apiClient, "requestfail", Dashboard.onRequestFail)
    }

    function onApiClientCreated(e, newApiClient) {
        initializeApiClient(newApiClient), window.$ && ($.ajax = newApiClient.ajax)
    }

    function defineConnectionManager(connectionManager) {
        window.ConnectionManager = connectionManager, define("connectionManager", [], function () {
            return connectionManager
        })
    }

    function bindConnectionManagerEvents(connectionManager, events, userSettings) {
        window.Events = events, events.on(ConnectionManager, "apiclientcreated", onApiClientCreated), connectionManager.currentApiClient = function () {
            if (!localApiClient) {
                var server = connectionManager.getLastUsedServer();
                server && (localApiClient = connectionManager.getApiClient(server.Id))
            }
            return localApiClient
        }, connectionManager.onLocalUserSignedIn = function (user) {
            return localApiClient = connectionManager.getApiClient(user.ServerId), window.ApiClient = localApiClient, userSettings.setUserInfo(user.Id, localApiClient)
        }, events.on(connectionManager, "localusersignedout", function () {
            userSettings.setUserInfo(null, null)
        })
    }

    function createConnectionManager() {
        return new Promise(function (resolve, reject) {
            require(["connectionManagerFactory", "apphost", "credentialprovider", "events", "userSettings"], function (connectionManagerExports, apphost, credentialProvider, events, userSettings) {
                window.MediaBrowser = Object.assign(window.MediaBrowser || {}, connectionManagerExports);
                var credentialProviderInstance = new credentialProvider,
                    promises = [apphost.getSyncProfile(), apphost.appInfo()];
                Promise.all(promises).then(function (responses) {
                    var deviceProfile = responses[0],
                        appInfo = responses[1],
                        capabilities = Dashboard.capabilities();
                    capabilities.DeviceProfile = deviceProfile;
                    var connectionManager = new MediaBrowser.ConnectionManager(credentialProviderInstance, appInfo.appName, appInfo.appVersion, appInfo.deviceName, appInfo.deviceId, capabilities, window.devicePixelRatio);
                    return defineConnectionManager(connectionManager), bindConnectionManagerEvents(connectionManager, events, userSettings), Dashboard.isConnectMode() ? void resolve() : (console.log("loading ApiClient singleton"), getRequirePromise(["apiclient"]).then(function (apiClientFactory) {
                        console.log("creating ApiClient singleton");
                        var apiClient = new apiClientFactory(Dashboard.serverAddress(), appInfo.appName, appInfo.appVersion, appInfo.deviceName, appInfo.deviceId, window.devicePixelRatio);
                        apiClient.enableAutomaticNetworking = !1, connectionManager.addApiClient(apiClient), require(["css!" + apiClient.getUrl("Branding/Css")]), window.ApiClient = apiClient, localApiClient = apiClient, console.log("loaded ApiClient singleton"), resolve()
                    }))
                })
            })
        })
    }

    function setDocumentClasses(browser) {
        var elem = document.documentElement;
        AppInfo.enableSupporterMembership || elem.classList.add("supporterMembershipDisabled")
    }

    function loadTheme() {
        var name = getParameterByName("theme");
        if (name) return void require(["themes/" + name + "/theme"]);
        if (!AppInfo.isNativeApp) {
            var date = new Date,
                month = date.getMonth(),
                day = date.getDate();
            return 9 == month && day >= 30 ? void require(["themes/halloween/theme"]) : void 0
        }
    }

    function returnFirstDependency(obj) {
        return obj
    }

    function getBowerPath() {
        return "bower_components"
    }

    function getLayoutManager(layoutManager, appHost) {
        return appHost.getDefaultLayout && (layoutManager.defaultLayout = appHost.getDefaultLayout()), layoutManager.init(), layoutManager
    }

    function getAppStorage(basePath) {
        try {
            return localStorage.setItem("_test", "0"), localStorage.removeItem("_test"), basePath + "/appstorage-localstorage"
        } catch (e) {
            return basePath + "/appstorage-memory"
        }
    }

    function createWindowHeadroom() {
        var headroom = new Headroom([], {
            tolerance: {
                down: 0,
                up: 0
            },
            classes: {}
        });
        return headroom.init(), headroom
    }

    function getCastSenderApiLoader() {
        var ccLoaded = !1;
        return {
            load: function () {
                return ccLoaded ? Promise.resolve() : new Promise(function (resolve, reject) {
                    var fileref = document.createElement("script");
                    fileref.setAttribute("type", "text/javascript"), fileref.onload = function () {
                        ccLoaded = !0, resolve()
                    }, fileref.setAttribute("src", "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js"), document.querySelector("head").appendChild(fileref)
                })
            }
        }
    }

    function getDummyCastSenderApiLoader() {
        return {
            load: function () {
                return window.chrome = window.chrome || {}, Promise.resolve()
            }
        }
    }

    function createSharedAppFooter(appFooter) {
        var footer = new appFooter({});
        return footer
    }

    function initRequire() {
        var urlArgs = "v=" + (window.dashboardVersion || (new Date).getDate()),
            bowerPath = getBowerPath(),
            apiClientBowerPath = bowerPath + "/emby-apiclient",
            embyWebComponentsBowerPath = bowerPath + "/emby-webcomponents",
            paths = {
                velocity: bowerPath + "/velocity/velocity.min",
                vibrant: bowerPath + "/vibrant/dist/vibrant",
                ironCardList: "components/ironcardlist/ironcardlist",
                scrollThreshold: "components/scrollthreshold",
                playlisteditor: "components/playlisteditor/playlisteditor",
                medialibrarycreator: "components/medialibrarycreator/medialibrarycreator",
                medialibraryeditor: "components/medialibraryeditor/medialibraryeditor",
                howler: bowerPath + "/howlerjs/howler.min",
                sortable: bowerPath + "/Sortable/Sortable.min",
                isMobile: bowerPath + "/isMobile/isMobile.min",
                headroom: bowerPath + "/headroomjs/dist/headroom",
                masonry: bowerPath + "/masonry/dist/masonry.pkgd.min",
                humanedate: "components/humanedate",
                libraryBrowser: "scripts/librarybrowser",
                chromecasthelpers: "components/chromecasthelpers",
                events: apiClientBowerPath + "/events",
                credentialprovider: apiClientBowerPath + "/credentials",
                apiclient: apiClientBowerPath + "/apiclient",
                connectionManagerFactory: bowerPath + "/emby-apiclient/connectionmanager",
                visibleinviewport: embyWebComponentsBowerPath + "/visibleinviewport",
                browserdeviceprofile: embyWebComponentsBowerPath + "/browserdeviceprofile",
                browser: embyWebComponentsBowerPath + "/browser",
                inputManager: embyWebComponentsBowerPath + "/inputmanager",
                qualityoptions: embyWebComponentsBowerPath + "/qualityoptions",
                hammer: bowerPath + "/hammerjs/hammer.min",
                pageJs: embyWebComponentsBowerPath + "/pagejs/page",
                focusManager: embyWebComponentsBowerPath + "/focusmanager",
                datetime: embyWebComponentsBowerPath + "/datetime",
                globalize: embyWebComponentsBowerPath + "/globalize",
                itemHelper: embyWebComponentsBowerPath + "/itemhelper",
                itemShortcuts: embyWebComponentsBowerPath + "/shortcuts",
                serverNotifications: embyWebComponentsBowerPath + "/servernotifications",
                playbackManager: embyWebComponentsBowerPath + "/playback/playbackmanager",
                autoPlayDetect: embyWebComponentsBowerPath + "/playback/autoplaydetect",
                nowPlayingHelper: embyWebComponentsBowerPath + "/playback/nowplayinghelper",
                pluginManager: embyWebComponentsBowerPath + "/pluginmanager",
                packageManager: embyWebComponentsBowerPath + "/packagemanager"
            };
        paths.hlsjs = bowerPath + "/hlsjs/dist/hls.min", define("mediaSession", [embyWebComponentsBowerPath + "/playback/mediasession"]), define("webActionSheet", [embyWebComponentsBowerPath + "/actionsheet/actionsheet"], returnFirstDependency), Dashboard.isRunningInCordova() ? paths.sharingMenu = "cordova/sharingwidget" : define("sharingMenu", [embyWebComponentsBowerPath + "/sharing/sharingmenu"], returnFirstDependency), paths.wakeonlan = apiClientBowerPath + "/wakeonlan", define("libjass", [bowerPath + "/libjass/libjass.min", "css!" + bowerPath + "/libjass/libjass"], returnFirstDependency), window.IntersectionObserver ? define("lazyLoader", [embyWebComponentsBowerPath + "/lazyloader/lazyloader-intersectionobserver"], returnFirstDependency) : define("lazyLoader", [embyWebComponentsBowerPath + "/lazyloader/lazyloader-scroll"], returnFirstDependency), define("imageLoader", [embyWebComponentsBowerPath + "/images/imagehelper"], returnFirstDependency), define("appfooter", ["components/appfooter/appfooter"], returnFirstDependency), define("dockedtabs", ["components/dockedtabs/dockedtabs"], returnFirstDependency), define("directorybrowser", ["components/directorybrowser/directorybrowser"], returnFirstDependency), define("metadataEditor", [embyWebComponentsBowerPath + "/metadataeditor/metadataeditor"], returnFirstDependency), define("personEditor", [embyWebComponentsBowerPath + "/metadataeditor/personeditor"], returnFirstDependency), define("playerSelectionMenu", [embyWebComponentsBowerPath + "/playback/playerselection"], returnFirstDependency), define("playerSettingsMenu", [embyWebComponentsBowerPath + "/playback/playersettingsmenu"], returnFirstDependency), define("libraryMenu", ["scripts/librarymenu"], returnFirstDependency), define("emby-collapse", [embyWebComponentsBowerPath + "/emby-collapse/emby-collapse"], returnFirstDependency), define("emby-button", [embyWebComponentsBowerPath + "/emby-button/emby-button"], returnFirstDependency), define("emby-itemscontainer", [embyWebComponentsBowerPath + "/emby-itemscontainer/emby-itemscontainer"], returnFirstDependency), define("emby-tabs", [embyWebComponentsBowerPath + "/emby-tabs/emby-tabs"], returnFirstDependency), define("itemHoverMenu", [embyWebComponentsBowerPath + "/itemhovermenu/itemhovermenu"], returnFirstDependency), define("multiSelect", [embyWebComponentsBowerPath + "/multiselect/multiselect"], returnFirstDependency), define("alphaPicker", [embyWebComponentsBowerPath + "/alphapicker/alphapicker"], returnFirstDependency), define("paper-icon-button-light", [embyWebComponentsBowerPath + "/emby-button/paper-icon-button-light"]), define("connectHelper", [embyWebComponentsBowerPath + "/emby-connect/connecthelper"], returnFirstDependency), define("emby-input", [embyWebComponentsBowerPath + "/emby-input/emby-input"], returnFirstDependency), define("emby-select", [embyWebComponentsBowerPath + "/emby-select/emby-select"], returnFirstDependency), define("emby-slider", [embyWebComponentsBowerPath + "/emby-slider/emby-slider"], returnFirstDependency), define("emby-checkbox", [embyWebComponentsBowerPath + "/emby-checkbox/emby-checkbox"], returnFirstDependency), define("emby-toggle", [embyWebComponentsBowerPath + "/emby-toggle/emby-toggle"], returnFirstDependency), define("emby-radio", [embyWebComponentsBowerPath + "/emby-radio/emby-radio"], returnFirstDependency), define("emby-textarea", [embyWebComponentsBowerPath + "/emby-textarea/emby-textarea"], returnFirstDependency), define("collectionEditor", [embyWebComponentsBowerPath + "/collectioneditor/collectioneditor"], returnFirstDependency), define("playlistEditor", [embyWebComponentsBowerPath + "/playlisteditor/playlisteditor"], returnFirstDependency), define("recordingCreator", [embyWebComponentsBowerPath + "/recordingcreator/recordingcreator"], returnFirstDependency), define("recordingEditor", [embyWebComponentsBowerPath + "/recordingcreator/recordingeditor"], returnFirstDependency), define("seriesRecordingEditor", [embyWebComponentsBowerPath + "/recordingcreator/seriesrecordingeditor"], returnFirstDependency), define("recordingFields", [embyWebComponentsBowerPath + "/recordingcreator/recordingfields"], returnFirstDependency), define("recordingHelper", [embyWebComponentsBowerPath + "/recordingcreator/recordinghelper"], returnFirstDependency), define("subtitleEditor", [embyWebComponentsBowerPath + "/subtitleeditor/subtitleeditor"], returnFirstDependency), define("itemIdentifier", [embyWebComponentsBowerPath + "/itemidentifier/itemidentifier"], returnFirstDependency), define("mediaInfo", [embyWebComponentsBowerPath + "/mediainfo/mediainfo"], returnFirstDependency), define("itemContextMenu", [embyWebComponentsBowerPath + "/itemcontextmenu"], returnFirstDependency), define("imageEditor", [embyWebComponentsBowerPath + "/imageeditor/imageeditor"], returnFirstDependency), define("dom", [embyWebComponentsBowerPath + "/dom"], returnFirstDependency), define("fullscreen-doubleclick", [embyWebComponentsBowerPath + "/fullscreen/fullscreen-doubleclick"], returnFirstDependency), define("fullscreenManager", [embyWebComponentsBowerPath + "/fullscreen/fullscreenmanager", "events"], returnFirstDependency), define("layoutManager", [embyWebComponentsBowerPath + "/layoutmanager", "apphost"], getLayoutManager), define("playMenu", [embyWebComponentsBowerPath + "/playmenu"], returnFirstDependency), define("refreshDialog", [embyWebComponentsBowerPath + "/refreshdialog/refreshdialog"], returnFirstDependency), define("backdrop", [embyWebComponentsBowerPath + "/backdrop/backdrop"], returnFirstDependency), define("fetchHelper", [embyWebComponentsBowerPath + "/fetchhelper"], returnFirstDependency), define("roundCardStyle", ["cardStyle", "css!" + embyWebComponentsBowerPath + "/cardbuilder/roundcard"], returnFirstDependency), define("cardStyle", ["css!" + embyWebComponentsBowerPath + "/cardbuilder/card"], returnFirstDependency), define("cardBuilder", [embyWebComponentsBowerPath + "/cardbuilder/cardbuilder"], returnFirstDependency), define("peoplecardbuilder", [embyWebComponentsBowerPath + "/cardbuilder/peoplecardbuilder"], returnFirstDependency), define("chaptercardbuilder", [embyWebComponentsBowerPath + "/cardbuilder/chaptercardbuilder"], returnFirstDependency), define("mouseManager", [embyWebComponentsBowerPath + "/input/mouse"], returnFirstDependency), define("deleteHelper", [embyWebComponentsBowerPath + "/deletehelper"], returnFirstDependency), define("tvguide", [embyWebComponentsBowerPath + "/guide/guide"], returnFirstDependency), define("programStyles", ["css!" + embyWebComponentsBowerPath + "/guide/programs"], returnFirstDependency), define("guide-settings-dialog", [embyWebComponentsBowerPath + "/guide/guide-settings"], returnFirstDependency), define("syncDialog", [embyWebComponentsBowerPath + "/sync/sync"], returnFirstDependency), define("syncToggle", [embyWebComponentsBowerPath + "/sync/synctoggle"], returnFirstDependency), define("syncJobEditor", [embyWebComponentsBowerPath + "/sync/syncjobeditor"], returnFirstDependency), define("syncJobList", [embyWebComponentsBowerPath + "/sync/syncjoblist"], returnFirstDependency), define("voiceDialog", [embyWebComponentsBowerPath + "/voice/voicedialog"], returnFirstDependency), define("voiceReceiver", [embyWebComponentsBowerPath + "/voice/voicereceiver"], returnFirstDependency), define("voiceProcessor", [embyWebComponentsBowerPath + "/voice/voiceprocessor"], returnFirstDependency), define("viewManager", [embyWebComponentsBowerPath + "/viewmanager/viewmanager"], function (viewManager) {
            return window.ViewManager = viewManager, viewManager.dispatchPageEvents(!0), viewManager
        }), Dashboard.isRunningInCordova() && window.MainActivity ? define("shell", ["cordova/shell"], returnFirstDependency) : define("shell", [embyWebComponentsBowerPath + "/shell"], returnFirstDependency), define("sharingmanager", [embyWebComponentsBowerPath + "/sharing/sharingmanager"], returnFirstDependency), Dashboard.isRunningInCordova() ? paths.apphost = "cordova/apphost" : paths.apphost = "components/apphost", Dashboard.isRunningInCordova() && window.MainActivity ? (paths.appStorage = "cordova/appstorage", paths.filesystem = "cordova/filesystem") : (paths.appStorage = getAppStorage(apiClientBowerPath), paths.filesystem = embyWebComponentsBowerPath + "/filesystem");
        var sha1Path = bowerPath + "/cryptojslib/components/sha1-min",
            md5Path = bowerPath + "/cryptojslib/components/md5-min",
            shim = {};
        shim[sha1Path] = {
            deps: [bowerPath + "/cryptojslib/components/core-min"]
        }, shim[md5Path] = {
            deps: [bowerPath + "/cryptojslib/components/core-min"]
        }, requirejs.config({
            waitSeconds: 0,
            map: {
                "*": {
                    css: bowerPath + "/emby-webcomponents/require/requirecss",
                    html: bowerPath + "/emby-webcomponents/require/requirehtml",
                    text: bowerPath + "/emby-webcomponents/require/requiretext"
                }
            },
            urlArgs: urlArgs,
            paths: paths,
            shim: shim
        }), define("cryptojs-sha1", [sha1Path]), define("cryptojs-md5", [md5Path]), define("jstree", [bowerPath + "/jstree/dist/jstree", "css!thirdparty/jstree/themes/default/style.min.css"]), define("dashboardcss", ["css!css/dashboard"]), define("jqmtable", ["thirdparty/jquerymobile-1.4.5/jqm.table", "css!thirdparty/jquerymobile-1.4.5/jqm.table.css"]), define("jqmwidget", ["thirdparty/jquerymobile-1.4.5/jqm.widget"]), define("jqmslider", ["thirdparty/jquerymobile-1.4.5/jqm.slider", "css!thirdparty/jquerymobile-1.4.5/jqm.slider.css"]), define("jqmpopup", ["thirdparty/jquerymobile-1.4.5/jqm.popup", "css!thirdparty/jquerymobile-1.4.5/jqm.popup.css"]), define("jqmlistview", ["css!thirdparty/jquerymobile-1.4.5/jqm.listview.css"]), define("jqmpanel", ["thirdparty/jquerymobile-1.4.5/jqm.panel", "css!thirdparty/jquerymobile-1.4.5/jqm.panel.css"]), define("slideshow", [embyWebComponentsBowerPath + "/slideshow/slideshow"], returnFirstDependency), define("fetch", [bowerPath + "/fetch/fetch"]), define("raf", [embyWebComponentsBowerPath + "/polyfills/raf"]), define("functionbind", [embyWebComponentsBowerPath + "/polyfills/bind"]), define("arraypolyfills", [embyWebComponentsBowerPath + "/polyfills/array"]), define("objectassign", [embyWebComponentsBowerPath + "/polyfills/objectassign"]), define("clearButtonStyle", ["css!" + embyWebComponentsBowerPath + "/clearbutton"]), define("userdataButtons", [embyWebComponentsBowerPath + "/userdatabuttons/userdatabuttons"], returnFirstDependency), define("listView", [embyWebComponentsBowerPath + "/listview/listview"], returnFirstDependency), define("listViewStyle", ["css!" + embyWebComponentsBowerPath + "/listview/listview"], returnFirstDependency), define("formDialogStyle", ["css!" + embyWebComponentsBowerPath + "/formdialog"], returnFirstDependency), define("indicators", [embyWebComponentsBowerPath + "/indicators/indicators"], returnFirstDependency), define("registrationServices", [embyWebComponentsBowerPath + "/registrationservices/registrationservices"], returnFirstDependency), Dashboard.isRunningInCordova() ? (define("iapManager", ["cordova/iap"], returnFirstDependency), define("fileupload", ["cordova/fileupload"], returnFirstDependency)) : (define("iapManager", ["components/iap"], returnFirstDependency), define("fileupload", [apiClientBowerPath + "/fileupload"], returnFirstDependency)), define("connectionmanager", [apiClientBowerPath + "/connectionmanager"]), define("cameraRoll", [apiClientBowerPath + "/cameraroll"], returnFirstDependency), define("contentuploader", [apiClientBowerPath + "/sync/contentuploader"]), define("serversync", [apiClientBowerPath + "/sync/serversync"]), define("multiserversync", [apiClientBowerPath + "/sync/multiserversync"]), define("offlineusersync", [apiClientBowerPath + "/sync/offlineusersync"]), define("mediasync", [apiClientBowerPath + "/sync/mediasync"]), define("swiper", [bowerPath + "/Swiper/dist/js/swiper.min", "css!" + bowerPath + "/Swiper/dist/css/swiper.min"], returnFirstDependency), define("scroller", [embyWebComponentsBowerPath + "/scroller/smoothscroller"], returnFirstDependency), define("toast", [embyWebComponentsBowerPath + "/toast/toast"], returnFirstDependency), define("scrollHelper", [embyWebComponentsBowerPath + "/scrollhelper"], returnFirstDependency), define("touchHelper", [embyWebComponentsBowerPath + "/touchhelper"], returnFirstDependency), define("appSettings", [embyWebComponentsBowerPath + "/appsettings"], updateAppSettings), define("userSettings", [embyWebComponentsBowerPath + "/usersettings/usersettings"], returnFirstDependency), define("userSettingsBuilder", [embyWebComponentsBowerPath + "/usersettings/usersettingsbuilder"], returnFirstDependency), define("material-icons", ["css!" + embyWebComponentsBowerPath + "/fonts/material-icons/style"]), define("robotoFont", ["css!" + embyWebComponentsBowerPath + "/fonts/roboto/style"]), define("scrollStyles", ["css!" + embyWebComponentsBowerPath + "/scrollstyles"]), define("navdrawer", ["components/navdrawer/navdrawer"], returnFirstDependency), define("viewcontainer", ["components/viewcontainer-lite", "css!" + embyWebComponentsBowerPath + "/viewmanager/viewcontainer-lite"], returnFirstDependency), define("queryString", [bowerPath + "/query-string/index"], function () {
            return queryString
        }), define("jQuery", [bowerPath + "/jquery/dist/jquery.slim.min"], function () {
            return window.ApiClient && (jQuery.ajax = ApiClient.ajax), jQuery
        }), define("fnchecked", ["legacy/fnchecked"]), define("dialogHelper", [embyWebComponentsBowerPath + "/dialoghelper/dialoghelper"], function (dialoghelper) {
            return dialoghelper.setOnOpen(onDialogOpen), dialoghelper
        }), define("inputmanager", ["inputManager"], returnFirstDependency), define("historyManager", ["embyRouter"], returnFirstDependency), define("headroom-window", ["headroom"], createWindowHeadroom), define("appfooter-shared", ["appfooter"], createSharedAppFooter), define("skinManager", [], function () {
            return {
                loadUserSkin: function () {
                    Emby.Page.show("/home.html")
                }
            }
        }), define("connectionManager", [], function () {
            return ConnectionManager
        }), define("apiClientResolver", [], function () {
            return function () {
                return window.ApiClient
            }
        }), define("embyRouter", [embyWebComponentsBowerPath + "/router"], function (embyRouter) {
            function showItem(item, serverId, options) {
                if ("string" == typeof item) require(["connectionManager"], function (connectionManager) {
                    var apiClient = connectionManager.currentApiClient();
                    apiClient.getItem(apiClient.getCurrentUserId(), item).then(function (item) {
                        embyRouter.showItem(item, options)
                    })
                });
                else {
                    2 == arguments.length && (options = arguments[1]);
                    var context = options ? options.context : null;
                    Emby.Page.show("/" + LibraryBrowser.getHref(item, context), {
                        item: item
                    })
                }
            }
            return embyRouter.showLocalLogin = function (apiClient, serverId, manualLogin) {
                Dashboard.navigate("login.html?serverid=" + serverId);
            }, embyRouter.showVideoOsd = function () {
                return Dashboard.navigate("videoosd.html")
            }, embyRouter.showSelectServer = function () {
                Dashboard.navigate("selectserver.html")
            }, embyRouter.showWelcome = function () {
                Dashboard.isConnectMode() ? Dashboard.navigate("connectlogin.html?mode=welcome") : Dashboard.navigate("login.html")
            }, embyRouter.showSettings = function () {
                Dashboard.navigate("mypreferencesmenu.html")
            }, embyRouter.showGuide = function () {
                Dashboard.navigate("livetv.html?tab=1")
            }, embyRouter.goHome = function () {
                Dashboard.navigate("home.html")
            }, embyRouter.showSearch = function () {
                Dashboard.navigate("search.html")
            }, embyRouter.showLiveTV = function () {
                Dashboard.navigate("livetv.html")
            }, embyRouter.showRecordedTV = function () {
                Dashboard.navigate("livetv.html?tab=3")
            }, embyRouter.showFavorites = function () {
                Dashboard.navigate("favorites.html")
            }, embyRouter.showSettings = function () {
                Dashboard.navigate("mypreferencesmenu.html")
            }, embyRouter.setTitle = function () {}, embyRouter.showItem = showItem, embyRouter
        })
    }

    function updateAppSettings(appSettings) {
        return appSettings.enableExternalPlayers = function (val) {
            return null != val && appSettings.set("externalplayers", val.toString()), "true" === appSettings.get("externalplayers")
        }, appSettings
    }

    function onDialogOpen(dlg) {
        dlg.classList.contains("background-theme-a") || dlg.classList.contains("actionSheet") || (dlg.classList.add("background-theme-b"), dlg.classList.add("ui-body-b"))
    }

    function initRequireWithBrowser(browser) {
        var bowerPath = getBowerPath(),
            apiClientBowerPath = bowerPath + "/emby-apiclient",
            embyWebComponentsBowerPath = bowerPath + "/emby-webcomponents";
        Dashboard.isRunningInCordova() && browser.safari ? define("actionsheet", ["cordova/actionsheet"], returnFirstDependency) : define("actionsheet", ["webActionSheet"], returnFirstDependency), "registerElement" in document ? define("registerElement", []) : browser.msie ? define("registerElement", [bowerPath + "/webcomponentsjs/webcomponents-lite.min.js"]) : define("registerElement", [bowerPath + "/document-register-element/build/document-register-element"]), window.chrome && window.chrome.sockets ? define("serverdiscovery", [apiClientBowerPath + "/serverdiscovery-chrome"], returnFirstDependency) : Dashboard.isRunningInCordova() && browser.android ? define("serverdiscovery", ["cordova/serverdiscovery"], returnFirstDependency) : Dashboard.isRunningInCordova() && browser.safari ? define("serverdiscovery", [apiClientBowerPath + "/serverdiscovery-chrome"], returnFirstDependency) : define("serverdiscovery", [apiClientBowerPath + "/serverdiscovery"], returnFirstDependency), Dashboard.isRunningInCordova() && browser.safari ? define("imageFetcher", ["cordova/imagestore"], returnFirstDependency) : define("imageFetcher", [embyWebComponentsBowerPath + "/images/basicimagefetcher"], returnFirstDependency);
        var preferNativeAlerts = browser.tv;
        preferNativeAlerts && window.alert ? define("alert", [embyWebComponentsBowerPath + "/alert/nativealert"], returnFirstDependency) : define("alert", [embyWebComponentsBowerPath + "/alert/alert"], returnFirstDependency), define("dialog", [embyWebComponentsBowerPath + "/dialog/dialog"], returnFirstDependency), preferNativeAlerts && window.confirm ? define("confirm", [embyWebComponentsBowerPath + "/confirm/nativeconfirm"], returnFirstDependency) : define("confirm", [embyWebComponentsBowerPath + "/confirm/confirm"], returnFirstDependency);
        var preferNativePrompt = preferNativeAlerts || browser.xboxOne;
        preferNativePrompt && window.confirm ? define("prompt", [embyWebComponentsBowerPath + "/prompt/nativeprompt"], returnFirstDependency) : define("prompt", [embyWebComponentsBowerPath + "/prompt/prompt"], returnFirstDependency), browser.tizen || browser.operaTv ? define("loading", [embyWebComponentsBowerPath + "/loading/loading-legacy"], returnFirstDependency) : define("loading", [embyWebComponentsBowerPath + "/loading/loading-lite"], returnFirstDependency), define("multi-download", [embyWebComponentsBowerPath + "/multidownload"], returnFirstDependency), Dashboard.isRunningInCordova() && browser.android ? (define("fileDownloader", ["cordova/filedownloader"], returnFirstDependency), define("localassetmanager", ["cordova/localassetmanager"], returnFirstDependency)) : (define("fileDownloader", [embyWebComponentsBowerPath + "/filedownloader"], returnFirstDependency), define("localassetmanager", [apiClientBowerPath + "/localassetmanager"], returnFirstDependency)), define("screenLock", [embyWebComponentsBowerPath + "/resourcelocks/nullresourcelock"], returnFirstDependency), Dashboard.isRunningInCordova() && browser.android ? (define("resourceLockManager", [embyWebComponentsBowerPath + "/resourcelocks/resourcelockmanager"], returnFirstDependency), define("wakeLock", ["cordova/wakelock"], returnFirstDependency), define("networkLock", ["cordova/networklock"], returnFirstDependency)) : (define("resourceLockManager", [embyWebComponentsBowerPath + "/resourcelocks/resourcelockmanager"], returnFirstDependency), define("wakeLock", [embyWebComponentsBowerPath + "/resourcelocks/nullresourcelock"], returnFirstDependency), define("networkLock", [embyWebComponentsBowerPath + "/resourcelocks/nullresourcelock"], returnFirstDependency)), Dashboard.isRunningInCordova() ? define("castSenderApiLoader", [], getDummyCastSenderApiLoader) : define("castSenderApiLoader", [], getCastSenderApiLoader)
    }

    function init() {
        Dashboard.isRunningInCordova() && browserInfo.android && define("nativedirectorychooser", ["cordova/nativedirectorychooser"]), Dashboard.isRunningInCordova() && browserInfo.android ? define("localsync", ["cordova/localsync"], returnFirstDependency) : define("localsync", ["scripts/localsync"], returnFirstDependency), define("livetvcss", ["css!css/livetv.css"]), define("detailtablecss", ["css!css/detailtable.css"]), define("autoorganizetablecss", ["css!css/autoorganizetable.css"]), define("buttonenabled", ["legacy/buttonenabled"]), initAfterDependencies()
    }

    function getRequirePromise(deps) {
        return new Promise(function (resolve, reject) {
            require(deps, resolve)
        })
    }

    function initAfterDependencies() {
        var list = [];
        window.fetch || list.push("fetch"), "function" != typeof Object.assign && list.push("objectassign"), Array.prototype.filter || list.push("arraypolyfills"), Function.prototype.bind || list.push("functionbind"), window.requestAnimationFrame || list.push("raf"), require(list, function () {
            createConnectionManager().then(function () {
                console.log("initAfterDependencies promises resolved"), require(["globalize"], function (globalize) {
                    window.Globalize = globalize, Promise.all([loadCoreDictionary(globalize), loadSharedComponentsDictionary(globalize)]).then(onGlobalizeInit)
                })
            })
        })
    }

    function loadSharedComponentsDictionary(globalize) {
        var baseUrl = "bower_components/emby-webcomponents/strings/",
            languages = ["ar", "bg-bg", "ca", "cs", "da", "de", "el", "en-gb", "en-us", "es-ar", "es-mx", "es", "fi", "fr", "gsw", "he", "hr", "hu", "id", "it", "kk", "ko", "ms", "nb", "nl", "pl", "pt-br", "pt-pt", "ro", "ru", "sk", "sl-si", "sv", "tr", "uk", "vi", "zh-cn", "zh-hk", "zh-tw"],
            translations = languages.map(function (i) {
                return {
                    lang: i,
                    path: baseUrl + i + ".json"
                }
            });
        globalize.loadStrings({
            name: "sharedcomponents",
            translations: translations
        })
    }

    function loadCoreDictionary(globalize) {
        var baseUrl = "strings/",
            languages = ["ar", "bg-bg", "ca", "cs", "da", "de", "el", "en-gb", "en-us", "es-ar", "es-mx", "es", "fi", "fr", "gsw", "he", "hr", "hu", "id", "it", "kk", "ko", "ms", "nb", "nl", "pl", "pt-br", "pt-pt", "ro", "ru", "sl-si", "sv", "tr", "uk", "vi", "zh-cn", "zh-hk", "zh-tw"],
            translations = languages.map(function (i) {
                return {
                    lang: i,
                    path: baseUrl + i + ".json"
                }
            });
        return globalize.defaultModule("core"), globalize.loadStrings({
            name: "core",
            translations: translations
        })
    }

    function onGlobalizeInit() {
        document.title = Globalize.translateDocument(document.title, "core"), require(["apphost"], function (appHost) {
            loadPlugins([], appHost, browserInfo).then(onAppReady)
        })
    }

    function defineRoute(newRoute, dictionary) {
        var baseRoute = Emby.Page.baseUrl(),
            path = newRoute.path;
        path = path.replace(baseRoute, ""), console.log("Defining route: " + path), newRoute.dictionary = newRoute.dictionary || dictionary || "core", Emby.Page.addRoute(path, newRoute)
    }

    function defineCoreRoutes() {
        console.log("Defining core routes"), defineRoute({
            path: "/addplugin.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin",
            controller: "scripts/addpluginpage"
        }), defineRoute({
            path: "/appservices.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/autoorganizelog.html",
            dependencies: ["scripts/taskbutton", "autoorganizetablecss"],
            controller: "dashboard/autoorganizelog",
            roles: "admin"
        }), defineRoute({
            path: "/autoorganizesmart.html",
            dependencies: ["emby-button"],
            controller: "dashboard/autoorganizesmart",
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/autoorganizetv.html",
            dependencies: ["emby-checkbox", "emby-input", "emby-button", "emby-select", "emby-collapse"],
            controller: "dashboard/autoorganizetv",
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/channelitems.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade"
        }), defineRoute({
            path: "/channels.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/channels"
        }), defineRoute({
            path: "/channelsettings.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/cinemamodeconfiguration.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/connectlogin.html",
            dependencies: ["emby-button", "emby-input"],
            autoFocus: !1,
            anonymous: !0,
            startup: !0,
            controller: "scripts/connectlogin"
        }), defineRoute({
            path: "/dashboard.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/dashboardgeneral.html",
            controller: "dashboard/dashboardgeneral",
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/dashboardhosting.html",
            dependencies: ["emby-input", "emby-button"],
            autoFocus: !1,
            roles: "admin",
            controller: "dashboard/dashboardhosting"
        }), defineRoute({
            path: "/device.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/devices.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/devicesupload.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/dlnaprofile.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/dlnaprofiles.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/dlnaserversettings.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/dlnasettings.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/edititemmetadata.html",
            dependencies: [],
            controller: "scripts/edititemmetadata",
            autoFocus: !1
        }), defineRoute({
            path: "/encodingsettings.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/favorites.html",
            dependencies: [],
            autoFocus: !1,
            controller: "scripts/favorites"
        }), defineRoute({
            path: "/forgotpassword.html",
            dependencies: ["emby-input", "emby-button"],
            anonymous: !0,
            startup: !0,
            controller: "scripts/forgotpassword"
        }), defineRoute({
            path: "/forgotpasswordpin.html",
            dependencies: ["emby-input", "emby-button"],
            autoFocus: !1,
            anonymous: !0,
            startup: !0,
            controller: "scripts/forgotpasswordpin"
        }), defineRoute({
            path: "/gamegenres.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/games.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/gamesrecommended.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/gamestudios.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/gamesystems.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/home.html",
            dependencies: [],
            autoFocus: !1,
            controller: "scripts/indexpage",
            transition: "fade",
            type: "home"
        }), defineRoute({
            path: "/index.html",
            dependencies: [],
            autoFocus: !1,
            isDefaultRoute: !0
        }), defineRoute({
            path: "/itemdetails.html",
            dependencies: ["emby-button", "scripts/livetvcomponents", "paper-icon-button-light", "emby-itemscontainer"],
            controller: "scripts/itemdetailpage",
            autoFocus: !1,
            transition: "fade"
        }), defineRoute({
            path: "/itemlist.html",
            dependencies: [],
            autoFocus: !1,
            controller: "scripts/itemlistpage",
            transition: "fade"
        }), defineRoute({
            path: "/kids.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/library.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/librarydisplay.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin",
            controller: "dashboard/librarydisplay"
        }), defineRoute({
            path: "/librarysettings.html",
            dependencies: ["emby-collapse", "emby-input", "emby-button", "emby-select"],
            autoFocus: !1,
            roles: "admin",
            controller: "dashboard/librarysettings"
        }), defineRoute({
            path: "/livetv.html",
            dependencies: ["emby-button", "livetvcss"],
            controller: "scripts/livetvsuggested",
            autoFocus: !1,
            transition: "fade"
        }), defineRoute({
            path: "/livetvguideprovider.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/livetvitems.html",
            dependencies: [],
            autoFocus: !1,
            controller: "scripts/livetvitems"
        }), defineRoute({
            path: "/livetvseriestimer.html",
            dependencies: ["emby-checkbox", "emby-input", "emby-button", "emby-collapse", "scripts/livetvcomponents", "scripts/livetvseriestimer", "livetvcss"],
            autoFocus: !1,
            controller: "scripts/livetvseriestimer"
        }), defineRoute({
            path: "/livetvsettings.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/livetvstatus.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/livetvtunerprovider-hdhomerun.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/livetvtunerprovider-m3u.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/livetvtunerprovider-satip.html",
            dependencies: ["emby-input"],
            autoFocus: !1,
            roles: "admin",
            controller: "dashboard/livetvtunerprovider-satip"
        }), defineRoute({
            path: "/log.html",
            dependencies: ["emby-checkbox"],
            roles: "admin",
            controller: "dashboard/logpage"
        }), defineRoute({
            path: "/login.html",
            dependencies: ["emby-button", "emby-input"],
            autoFocus: !1,
            anonymous: !0,
            startup: !0,
            controller: "scripts/loginpage"
        }), defineRoute({
            path: "/metadataadvanced.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/metadataimages.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/metadatanfo.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/metadatasubtitles.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/movies.html",
            dependencies: ["emby-button"],
            autoFocus: !1,
            controller: "scripts/moviesrecommended",
            transition: "fade"
        }), defineRoute({
            path: "/music.html",
            dependencies: [],
            controller: "scripts/musicrecommended",
            autoFocus: !1,
            transition: "fade"
        }), defineRoute({
            path: "/mypreferencesdisplay.html",
            dependencies: ["emby-checkbox", "emby-button", "emby-select"],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/mypreferencesdisplay"
        }), defineRoute({
            path: "/mypreferenceshome.html",
            dependencies: ["emby-checkbox", "emby-button", "emby-select"],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/mypreferenceshome"
        }), defineRoute({
            path: "/mypreferenceslanguages.html",
            dependencies: ["emby-button", "emby-checkbox", "emby-select"],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/mypreferenceslanguages"
        }), defineRoute({
            path: "/mypreferencesmenu.html",
            dependencies: ["emby-button"],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/mypreferencescommon"
        }), defineRoute({
            path: "/myprofile.html",
            dependencies: ["emby-button", "emby-collapse", "emby-checkbox", "emby-input"],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/myprofile"
        }), defineRoute({
            path: "/mysync.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/mysync"
        }), defineRoute({
            path: "/camerauploadsettings.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/camerauploadsettings"
        }), defineRoute({
            path: "/mysyncjob.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/syncjob"
        }), defineRoute({
            path: "/mysyncsettings.html",
            dependencies: ["emby-checkbox", "emby-input", "emby-button", "paper-icon-button-light"],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/mysyncsettings"
        }), defineRoute({
            path: "/notificationlist.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/notificationsetting.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/notificationsettings.html",
            controller: "scripts/notificationsettings",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/nowplaying.html",
            dependencies: ["paper-icon-button-light", "emby-slider", "emby-button", "emby-input", "emby-itemscontainer"],
            controller: "scripts/nowplayingpage",
            autoFocus: !1,
            transition: "fade",
            fullscreen: !0,
            supportsThemeMedia: !0
        }), defineRoute({
            path: "/photos.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade"
        }), defineRoute({
            path: "/playbackconfiguration.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/playlists.html",
            dependencies: [],
            autoFocus: !1,
            transition: "fade",
            controller: "scripts/playlists"
        }), defineRoute({
            path: "/plugincatalog.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/plugins.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/reports.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/scheduledtask.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/scheduledtasks.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/search.html",
            dependencies: [],
            controller: "scripts/searchpage"
        }), defineRoute({
            path: "/secondaryitems.html",
            dependencies: [],
            autoFocus: !1,
            controller: "scripts/secondaryitems"
        }), defineRoute({
            path: "/selectserver.html",
            dependencies: ["listViewStyle", "emby-button"],
            autoFocus: !1,
            anonymous: !0,
            startup: !0,
            controller: "scripts/selectserver"
        }), defineRoute({
            path: "/serversecurity.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/shared.html",
            dependencies: [],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/streamingsettings.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/support.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/supporterkey.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/syncactivity.html",
            dependencies: [],
            autoFocus: !1,
            controller: "scripts/syncactivity"
        }), defineRoute({
            path: "/syncsettings.html",
            dependencies: [],
            autoFocus: !1
        }), defineRoute({
            path: "/tv.html",
            dependencies: ["paper-icon-button-light", "emby-button"],
            autoFocus: !1,
            controller: "scripts/tvrecommended",
            transition: "fade"
        }), defineRoute({
            path: "/useredit.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/userlibraryaccess.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/usernew.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/userparentalcontrol.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/userpassword.html",
            dependencies: ["emby-input", "emby-button", "emby-checkbox"],
            autoFocus: !1,
            controller: "scripts/userpasswordpage"
        }), defineRoute({
            path: "/userprofiles.html",
            dependencies: [],
            autoFocus: !1,
            roles: "admin"
        }), defineRoute({
            path: "/wizardagreement.html",
            dependencies: ["dashboardcss"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/wizardcomponents.html",
            dependencies: ["dashboardcss", "emby-button", "emby-input", "emby-select"],
            autoFocus: !1,
            anonymous: !0,
            controller: "dashboard/wizardcomponents"
        }), defineRoute({
            path: "/wizardfinish.html",
            dependencies: ["emby-button", "dashboardcss"],
            autoFocus: !1,
            anonymous: !0,
            controller: "dashboard/wizardfinishpage"
        }), defineRoute({
            path: "/wizardlibrary.html",
            dependencies: ["dashboardcss"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/wizardlivetvguide.html",
            dependencies: ["dashboardcss"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/wizardlivetvtuner.html",
            dependencies: ["dashboardcss"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/wizardsettings.html",
            dependencies: ["dashboardcss"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/wizardstart.html",
            dependencies: ["dashboardcss"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/wizarduser.html",
            dependencies: ["dashboardcss", "emby-input"],
            autoFocus: !1,
            anonymous: !0
        }), defineRoute({
            path: "/videoosd.html",
            dependencies: [],
            transition: "fade",
            controller: "scripts/videoosd",
            autoFocus: !1,
            type: "video-osd",
            supportsThemeMedia: !0,
            fullscreen: !0
        }), defineRoute({
            path: "/configurationpage",
            dependencies: ["jQuery"],
            autoFocus: !1,
            enableCache: !1,
            enableContentQueryString: !0,
            roles: "admin"
        }), defineRoute({
            path: "/",
            isDefaultRoute: !0,
            autoFocus: !1,
            dependencies: []
        })
    }

    function loadPlugins(externalPlugins, appHost, browser, shell) {
        console.log("Loading installed plugins");
        var list = ["bower_components/emby-webcomponents/playback/playbackvalidation"];
        Dashboard.isRunningInCordova() && browser.android ? (document.createElement("audio").canPlayType("audio/flac").replace(/no/, "") && document.createElement("audio").canPlayType('audio/ogg; codecs="opus"').replace(/no/, "") ? window.VlcAudio = !0 : window.VlcAudio = !0, list.push("cordova/vlcplayer")) : Dashboard.isRunningInCordova() && browser.safari && list.push("cordova/audioplayer"), list.push("bower_components/emby-webcomponents/htmlaudioplayer/plugin"), Dashboard.isRunningInCordova() && browser.safari && list.push("cordova/chromecast"), Dashboard.isRunningInCordova() && browser.android && list.push("cordova/externalplayer"), list.push("bower_components/emby-webcomponents/htmlvideoplayer/plugin"), appHost.supports("remotecontrol") && (list.push("bower_components/emby-webcomponents/sessionplayer"), browser.chrome && list.push("bower_components/emby-webcomponents/chromecastplayer")), list.push("bower_components/emby-webcomponents/youtubeplayer/plugin");
        for (var i = 0, length = externalPlugins.length; i < length; i++) list.push(externalPlugins[i]);
        return new Promise(function (resolve, reject) {
            Promise.all(list.map(loadPlugin)).then(function () {
                require(["packageManager"], function (packageManager) {
                    packageManager.init().then(resolve, reject)
                })
            }, reject)
        })
    }

    function loadPlugin(url) {
        return new Promise(function (resolve, reject) {
            require(["pluginManager"], function (pluginManager) {
                pluginManager.loadPlugin(url).then(resolve, reject)
            })
        })
    }

    function enableNativeGamepadKeyMapping() {
        return !(!window.navigator || "string" != typeof window.navigator.gamepadInputEmulation) && (window.navigator.gamepadInputEmulation = "keyboard", !0)
    }

    function isGamepadSupported() {
        return "ongamepadconnected" in window || navigator.getGamepads || navigator.webkitGetGamepads
    }

    function onAppReady() {
        console.log("Begin onAppReady");
        var deps = [];
        deps.push("apphost"), deps.push("embyRouter"), AppInfo.isNativeApp && browserInfo.android || document.documentElement.classList.add("minimumSizeTabs"), AppInfo.isNativeApp && browserInfo.safari && deps.push("css!devices/ios/ios.css"), loadTheme(), Dashboard.isRunningInCordova() && (deps.push("registrationServices"), browserInfo.android && deps.push("cordova/androidcredentials")), deps.push("libraryMenu"), console.log("onAppReady - loading dependencies"), require(deps, function (appHost, pageObjects) {
            console.log("Loaded dependencies in onAppReady"), window.Emby = {}, window.Emby.Page = pageObjects, defineCoreRoutes(), Emby.Page.start({
                click: !0,
                hashbang: Dashboard.isRunningInCordova()
            });
            var postInitDependencies = [];
            !enableNativeGamepadKeyMapping() && isGamepadSupported() && postInitDependencies.push("bower_components/emby-webcomponents/input/gamepadtokey"), postInitDependencies.push("bower_components/emby-webcomponents/thememediaplayer"), postInitDependencies.push("css!css/chromecast.css"), postInitDependencies.push("scripts/autobackdrops"), Dashboard.isRunningInCordova() && (browserInfo.android ? (postInitDependencies.push("cordova/mediasession"), postInitDependencies.push("cordova/chromecast")) : browserInfo.safari && (postInitDependencies.push("cordova/volume"), postInitDependencies.push("cordova/statusbar"), postInitDependencies.push("cordova/orientation"), postInitDependencies.push("cordova/remotecontrols"))), postInitDependencies.push("scripts/nowplayingbar"), appHost.supports("remotecontrol") && (postInitDependencies.push("playerSelectionMenu"), postInitDependencies.push("bower_components/emby-webcomponents/playback/remotecontrolautoplay")), appHost.supports("physicalvolumecontrol") || postInitDependencies.push("bower_components/emby-webcomponents/playback/volumeosd"), navigator.mediaSession && postInitDependencies.push("mediaSession"), browserInfo.mobile || navigator.userAgent.toLowerCase().indexOf("windows") == -1 || postInitDependencies.push("robotoFont"), postInitDependencies.push("bower_components/emby-webcomponents/input/api"), postInitDependencies.push("mouseManager"), browserInfo.tv || (registerServiceWorker(), window.Notification && postInitDependencies.push("bower_components/emby-webcomponents/notifications/notifications")), postInitDependencies.push("playerSelectionMenu"), appHost.supports("fullscreenchange") && require(["fullscreen-doubleclick"]), require(postInitDependencies), initAutoSync()
        })
    }

    function registerServiceWorker() {
        if (navigator.serviceWorker) try {
            navigator.serviceWorker.register("serviceworker.js").then(function () {
                return navigator.serviceWorker.ready
            }).then(function (reg) {
                if (reg && reg.sync) return reg.sync.register("emby-sync").then(function () {
                    window.SyncRegistered = Dashboard.isConnectMode()
                })
            })
        } catch (err) {
            console.log("Error registering serviceWorker: " + err)
        }
    }

    function initAutoSync() {
        require(["serverNotifications", "events"], function (serverNotifications, events) {
            events.on(serverNotifications, "SyncJobItemReady", function (e, apiClient, data) {
                require(["localsync"], function (localSync) {
                    localSync.sync({})
                })
            })
        })
    }

    function onWebComponentsReady(browser) {
        var initialDependencies = [];
        window.Promise && !browser.web0s || initialDependencies.push("bower_components/emby-webcomponents/native-promise-only/lib/npo.src"), initRequireWithBrowser(browser), window.browserInfo = browser, setAppInfo(), setDocumentClasses(browser), require(initialDependencies, init)
    }
    var localApiClient;
    initRequire(), require(["browser"], onWebComponentsReady)
}(), pageClassOn("viewinit", "page", function () {
    "use strict";
    var page = this,
        current = page.getAttribute("data-theme");
    if (!current) {
        var newTheme;
        newTheme = page.classList.contains("libraryPage") ? "b" : "a", page.setAttribute("data-theme", newTheme), current = newTheme
    }
    page.classList.add("ui-page"), page.classList.add("ui-page-theme-" + current), page.classList.add("ui-body-" + current);
    for (var contents = page.querySelectorAll("div[data-role='content']"), i = 0, length = contents.length; i < length; i++) {
        var content = contents[i];
        content.setAttribute("role", "main"), content.classList.add("ui-content")
    }
}), pageClassOn("viewshow", "page", function () {
    "use strict";
    var page = this,
        currentTheme = page.classList.contains("ui-page-theme-a") ? "a" : "b",
        docElem = document.documentElement;
    "a" == currentTheme ? (docElem.classList.add("background-theme-a"), docElem.classList.remove("background-theme-b")) : (docElem.classList.add("background-theme-b"), docElem.classList.remove("background-theme-a")), Dashboard.ensureHeader(page)
});