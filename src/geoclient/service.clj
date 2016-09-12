(ns geoclient.service
  (:require [geoclient.cache-repo :as cache]
            [clojure.string :as cs]
            [clj-http.client :as http]
            [clojure.data.json :as json]
            [clojure.core.async :refer [>! <! <!! chan alts!
                                        go go-loop timeout]]))

(def ^:private +service-url+
  "http://geo.truckerpathteam.com/maps/api/geocode/json")

(def ^:dynamic *request-timeout-millis* 1000)

(def ^{:private :true :dynamic true} *save-queue* (chan))

(go-loop []
  (let [{:keys [query-address address lat lng]} (<! *save-queue*)]
    (cache/add-item query-address address lat lng)
    (recur)))

(defn- process-result! [{address "formatted_address"
                         {{:strs [lat lng]} "location"} "geometry"}
                        query-address]
  (let [result {:query-address query-address :address address
                :lat lat :lng lng}]
    (go (>! *save-queue* result))
    result))

(defn- handle-response [resp query-address]
  (let [{results "results"} (-> resp :body json/read-str)]
    (doall (map #(process-result! % query-address) results))))

(defn- get-remote-geo [address]
  (try (deref (future
                {:results (handle-response (http/get
                                            +service-url+
                                            {:query-params {"address" address}})
                                           address)})
              *request-timeout-millis* {:error :timeout})
       (catch Throwable e (println e) {:error :server-error})))

(defn lookup-geo [address]
  (if (and address (not (cs/blank? address)))
    (let [address (cs/lower-case (cs/trim address))]
      (if-let [locations (seq (cache/get-items address))]
        {:results locations}
        (get-remote-geo address)))
    {:error (str "incorrect-address: " address)}))

(defn dump-cache [] (vec (cache/select-all)))
