(ns geoclient.cache-repo
  (:require [clojure.java.jdbc :as jdbc]
            [clojure.string :as cs]))

(def ^{:private true :dynamic true}
  *db-spec* {:subprotocol "hsqldb"
             :subname "mem:geo_cache_db"})

(def ^:private +create-table-stmt+
  (str "CREATE TABLE IF NOT EXISTS geo_data ("
       "id IDENTITY NOT NULL,"
       "query_address VARCHAR(255) NOT NULL,"
       "address VARCHAR(255) NOT NULL,"
       "date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,"
       "lat FLOAT,"
       "lng FLOAT);"))

(defn init-db []
  (jdbc/db-do-commands *db-spec* +create-table-stmt+))

(defn get-items [address]
  (jdbc/query *db-spec*
              [(str "SELECT DISTINCT address, lat, lng FROM geo_data "
                    "WHERE query_address = ? AND "
                    "date_added >= CURRENT_TIMESTAMP - 1 DAY;")
               address]))

(defn remove-outdated []
  (jdbc/query *db-spec*
              [(str "DELETE FROM geo_data "
                    "WHERE date_added < CURRENT_TIMESTAMP - 1 DAY;")]))

(defn select-all []
  (jdbc/query *db-spec*
              ["select * from geo_data;"]))

(defn add-item [query-address address lat lng]
  (jdbc/insert! *db-spec* :geo_data
                {:query_address query-address
                 :address address
                 :lat lat
                 :lng lng}))
