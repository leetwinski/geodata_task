(ns geoclient.handler
  (:require [compojure.core :refer :all]
            [compojure.route :as route]
            [ring.middleware.json :refer [wrap-json-response]]
            [ring.middleware.defaults :refer [wrap-defaults site-defaults]]
            [ring.util.response :refer [redirect]]
            [geoclient.service :as service]
            [geoclient.cache-repo :as repo]))

;;TODO add render
(defroutes app-routes
  (GET "/" [] (redirect "/index.html"))
  (GET "/geocode" {{address :address} :params}
       {:body (service/lookup-geo address)})
  (GET "/geocode/dump" request
       {:body (service/dump-cache)})
  (route/not-found "Not Found"))

(defn init-app []
  (repo/init-db)
  (-> app-routes
     (wrap-defaults site-defaults)
     (wrap-json-response)))

(def app (init-app))
