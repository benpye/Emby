define(['libraryBrowser', 'listView', 'cardBuilder', 'imageLoader', 'apphost', 'globalize', 'emby-itemscontainer'], function (libraryBrowser, listView, cardBuilder, imageLoader, appHost, globalize) {
    'use strict';

    return function (view, params) {

        var data = {};

        function addCurrentItemToQuery(query, item) {

            if (params.parentId) {
                query.ParentId = params.parentId;
            }

            if (item.Type == "Person") {
                query.PersonIds = item.Id;
            }
            else if (item.Type == "Genre") {
                query.Genres = item.Name;
            }
            else if (item.Type == "MusicGenre") {
                query.Genres = item.Name;
            }
            else if (item.Type == "GameGenre") {
                query.Genres = item.Name;
            }
            else if (item.Type == "Studio") {
                query.StudioIds = item.Id;
            }
            else if (item.Type == "MusicArtist") {
                query.ArtistIds = item.Id;
            } else {
                query.ParentId = item.Id;
            }
        }

        function getQuery(parentItem) {

            var key = getSavedQueryKey();
            var pageData = data[key];

            if (!pageData) {
                pageData = data[key] = {
                    query: {
                        SortBy: "SortName",
                        SortOrder: "Ascending",
                        Recursive: params.recursive !== 'false',
                        Fields: "PrimaryImageAspectRatio,SortName,BasicSyncInfo",
                        ImageTypeLimit: 1,
                        EnableImageTypes: "Primary,Backdrop,Banner,Thumb",
                        StartIndex: 0,
                        Limit: libraryBrowser.getDefaultPageSize()
                    }
                };

                var type = params.type;
                if (type) {
                    pageData.query.IncludeItemTypes = type;

                    if (type == 'Audio') {
                        pageData.query.SortBy = 'Album,SortName';
                    }
                }

                var filters = params.filters;
                if (type) {
                    pageData.query.Filters = filters;
                }

                if (parentItem) {
                    addCurrentItemToQuery(pageData.query, parentItem);
                }

                libraryBrowser.loadSavedQueryValues(key, pageData.query);
            }
            return pageData.query;
        }

        function getSavedQueryKey() {

            return libraryBrowser.getSavedQueryKey();
        }

        function parentWithClass(elem, className) {

            while (!elem.classList || !elem.classList.contains(className)) {
                elem = elem.parentNode;

                if (!elem) {
                    return null;
                }
            }

            return elem;
        }
        function onListItemClick(e) {

            var mediaItem = parentWithClass(e.target, 'mediaItem');
            if (mediaItem) {
                var info = libraryBrowser.getListItemInfo(mediaItem);

                if (info.mediaType == 'Photo') {
                    var query = getQuery();

                    require(['scripts/photos'], function () {
                        Photos.startSlideshow(view, query, info.id);
                    });
                    return false;
                }
            }
        }

        function onViewStyleChange(parentItem) {

            var query = getQuery(parentItem);

            var itemsContainer = view.querySelector('#items');

            if (query.IncludeItemTypes == "Audio") {

                itemsContainer.classList.add('vertical-list');
                itemsContainer.classList.remove('vertical-wrap');

            } else {

                itemsContainer.classList.remove('vertical-list');
                itemsContainer.classList.add('vertical-wrap');
            }
        }

        function getPromise(parentItem) {

            var apiClient = ApiClient;
            var query = getQuery(parentItem);

            if (params.type === 'nextup') {
                return apiClient.getNextUpEpisodes({
                    Limit: query.Limit,
                    Fields: 'PrimaryImageAspectRatio,SeriesInfo,DateCreated,BasicSyncInfo',
                    UserId: apiClient.getCurrentUserId(),
                    ImageTypeLimit: 1,
                    EnableImageTypes: 'Primary,Backdrop,Thumb'
                });
            } else {
                return apiClient.getItems(apiClient.getCurrentUserId(), query);
            }
        }

        function reloadItems(parentItem) {

            Dashboard.showLoadingMsg();

            getPromise(parentItem).then(function (result) {

                // Scroll back up so they can see the results from the beginning
                window.scrollTo(0, 0);

                var query = getQuery(parentItem);
                var html = '';
                var pagingHtml = libraryBrowser.getQueryPagingHtml({
                    startIndex: query.StartIndex,
                    limit: query.Limit,
                    totalRecordCount: result.TotalRecordCount,
                    showLimit: false
                });

                var i, length;
                var elems;

                elems = view.querySelectorAll('.paging');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].innerHTML = pagingHtml;
                }

                var itemsContainer = view.querySelector('#items');
                var supportsImageAnalysis = appHost.supports('imageanalysis');

                if (query.IncludeItemTypes == "Audio") {

                    html = listView.getListViewHtml({
                        items: result.Items,
                        playFromHere: true,
                        action: 'playallfromhere',
                        smallIcon: true
                    });

                } else {

                    var posterOptions = {
                        items: result.Items,
                        shape: "auto",
                        centerText: true,
                        lazy: true
                    };

                    if (params.type === 'nextup') {

                        posterOptions.preferThumb = true;
                        posterOptions.shape = 'backdrop';
                        posterOptions.scalable = true;
                        posterOptions.showTitle = true;
                        posterOptions.showParentTitle = true;
                        posterOptions.overlayText = false;
                        posterOptions.centerText = !supportsImageAnalysis;
                        posterOptions.overlayPlayButton = true;
                        posterOptions.cardLayout = supportsImageAnalysis;
                        posterOptions.vibrant = supportsImageAnalysis;
                    } else {

                        if (query.IncludeItemTypes == "MusicAlbum") {
                            posterOptions.overlayText = false;
                            posterOptions.showParentTitle = true;
                            posterOptions.showTitle = true;
                            posterOptions.overlayPlayButton = true;
                        }
                        else if (query.IncludeItemTypes == "MusicArtist") {
                            posterOptions.overlayText = false;
                            posterOptions.overlayPlayButton = true;
                        }
                        else if (query.IncludeItemTypes == "Episode") {
                            posterOptions.overlayText = false;
                            posterOptions.showParentTitle = true;
                            posterOptions.showTitle = true;
                            posterOptions.overlayPlayButton = true;
                        }
                    }

                    // Poster
                    html = cardBuilder.getCardsHtml(posterOptions);
                }

                itemsContainer.innerHTML = html;
                imageLoader.lazyChildren(itemsContainer);

                function onNextPageClick() {
                    query.StartIndex += query.Limit;
                    reloadItems(view);
                }

                function onPreviousPageClick() {
                    query.StartIndex -= query.Limit;
                    reloadItems(view);
                }

                elems = view.querySelectorAll('.btnNextPage');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onNextPageClick);
                }

                elems = view.querySelectorAll('.btnPreviousPage');
                for (i = 0, length = elems.length; i < length; i++) {
                    elems[i].addEventListener('click', onPreviousPageClick);
                }

                Dashboard.hideLoadingMsg();
            });
        }

        view.addEventListener('click', onListItemClick);

        function getItemPromise() {

            var id = params.genreId || params.studioId || params.artistId || params.personId || params.parentId;

            if (id) {
                return ApiClient.getItem(Dashboard.getCurrentUserId(), id);
            }

            var name = params.genre;

            if (name) {
                return ApiClient.getGenre(name, Dashboard.getCurrentUserId());
            }

            name = params.musicgenre;

            if (name) {
                return ApiClient.getMusicGenre(name, Dashboard.getCurrentUserId());
            }

            name = params.gamegenre;

            if (name) {
                return ApiClient.getGameGenre(name, Dashboard.getCurrentUserId());
            }

            return null;
        }

        view.addEventListener('viewbeforeshow', function (e) {

            var parentPromise = getItemPromise();

            if (parentPromise) {
                parentPromise.then(function (parent) {
                    LibraryMenu.setTitle(parent.Name);

                    if (params.type === 'nextup') {
                        LibraryMenu.setTitle(globalize.translate('HeaderNextUp'));
                    }

                    onViewStyleChange(parent);
                    reloadItems(parent);
                });
            }

            else {
                onViewStyleChange();
                reloadItems();
            }
        });
    };


});
