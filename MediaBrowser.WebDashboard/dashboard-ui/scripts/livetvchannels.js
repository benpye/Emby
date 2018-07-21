define(['cardBuilder', 'imageLoader', 'libraryBrowser', 'loading', 'emby-itemscontainer'], function (cardBuilder, imageLoader, libraryBrowser, loading) {
    'use strict';

    return function (view, params, tabContent) {

        var self = this;

        var data = {};

        var pageData;

        function getPageData() {
            if (!pageData) {
                pageData = data[key] = {
                    query: {
                        StartIndex: 0,
                        Limit: 100,
                        Fields: "PrimaryImageAspectRatio"
                    }
                };
            }
            return pageData;
        }

        function getQuery() {

            return getPageData().query;
        }

        function getChannelsHtml(channels) {

            return cardBuilder.getCardsHtml({
                items: channels,
                shape: "square",
                showTitle: true,
                lazy: true,
                cardLayout: true,
                showDetailsMenu: true,
                showCurrentProgram: true
            });
        }

        function renderChannels(context, result) {

            var query = getQuery();

            context.querySelector('.paging').innerHTML = LibraryBrowser.getQueryPagingHtml({
                startIndex: query.StartIndex,
                limit: query.Limit,
                totalRecordCount: result.TotalRecordCount,
                showLimit: false,
                updatePageSizeSetting: false,
                filterButton: false
            });

            var html = getChannelsHtml(result.Items);

            var elem = context.querySelector('#items');
            elem.innerHTML = html;
            imageLoader.lazyChildren(elem);

            var i, length;
            var elems;

            function onNextPageClick() {
                query.StartIndex += query.Limit;
                reloadItems(context);
            }

            function onPreviousPageClick() {
                query.StartIndex -= query.Limit;
                reloadItems(context);
            }

            elems = context.querySelectorAll('.btnNextPage');
            for (i = 0, length = elems.length; i < length; i++) {
                elems[i].addEventListener('click', onNextPageClick);
            }

            elems = context.querySelectorAll('.btnPreviousPage');
            for (i = 0, length = elems.length; i < length; i++) {
                elems[i].addEventListener('click', onPreviousPageClick);
            }
        }

        function showFilterMenu(context) {

            require(['components/filterdialog/filterdialog'], function (filterDialogFactory) {

                var filterDialog = new filterDialogFactory({
                    query: getQuery(),
                    mode: 'livetvchannels'
                });

                Events.on(filterDialog, 'filterchange', function () {
                    reloadItems(context);
                });

                filterDialog.show();
            });
        }

        function reloadItems(context, save) {

            loading.show();

            var query = getQuery();

            var apiClient = ApiClient;

            query.UserId = apiClient.getCurrentUserId();

            apiClient.getLiveTvChannels(query).then(function (result) {

                renderChannels(context, result);

                loading.hide();
            });
        }

        tabContent.querySelector('.btnFilter').addEventListener('click', function () {
            showFilterMenu(tabContent);
        });

        self.renderTab = function () {

            reloadItems(tabContent);
        };
    };

});
