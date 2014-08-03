angular.module('main', ['ngRoute', 'ui.bootstrap', 'luegg.directives']).
        config(['$routeProvider',
            function($routeProvider) {
                $routeProvider.
                        when('/', {
                            templateUrl: '/partials/dashboard.html',
                            controller: DashboardCtrl
                        }).
                        when('/probing', {
                            templateUrl: '/partials/probing.html',
                            controller: ProbingCtrl
                        }).
                        when('/preview', {
                            templateUrl: '/partials/preview.html',
                             controller: PreviewCtrl
                        }).
                        when('/settings', {
                            templateUrl: '/partials/settings.html'/*,
                             controller: JogCtrl*/
                        }).
                        when('/help', {
                            templateUrl: '/partials/help.html'/*,
                             controller: JogCtrl*/
                        }).
                        otherwise({
                            redirectTo: '/'
                        });
            }
        ]).
        directive('onReadFile', function($parse) {
            return {
                restrict: 'A',
                scope: false,
                link: function(scope, element, attrs) {
                    var fn = $parse(attrs.onReadFile);

                    element.on('change', function(onChangeEvent) {
                        var reader = new FileReader();

                        reader.onload = function(onLoadEvent) {
                            scope.$apply(function() {
                                fn(scope, {$fileContent: onLoadEvent.target.result});
                            });
                        };

                        reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0]);
                    });
                }
            };
        }).
        run(function($rootScope)
        {
            $rootScope.commands=""
        })

/*
 //Deutsch als Locale setzen
 .run(function($rootScope, $location, $locale) {
 $locale.id = "de-de";
 });*/
