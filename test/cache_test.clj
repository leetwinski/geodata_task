(ns cache-test
  (:require [clojure.test :as t]
            [geoclient.cache-repo :as repo])
  (:import java.util.Date))

(repo/init-db)

(def ^:private records
  [["aaa" "aaa-addr1" 0.0 1.0 :timestamp (Date. 2010 1 1)]
   ["aaa" "aaa-addr2" 2.0 3.0]
   ["aaa" "aaa-addr2" 2.0 3.0]
   ["bbb" "bbb-addr1" 4.0 5.0]])

(doseq [data records]
  (apply repo/add-item data))

(t/deftest cache-repo-test
  (t/testing "items added to db"
    (let [db-records (repo/select-all)]
      (t/is (= (count db-records) 4))
      
      (t/is (= records
               (map (juxt :query_address :address :lat :lng)
                    db-records)))))

  (t/testing "repo lookup"
    (let [db-records (repo/get-items "aaa")]
      
      (t/is (= (count db-records) 2))

      (t/is (= (distinct
                (keep #(when (= (first %) "aaa") (rest %)) records))
               (map (juxt :address :lat :lng) db-records))))))

