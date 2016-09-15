(ns cache-test
  (:require [clojure.test :as t]
            [geoclient.cache-repo :as repo])
  (:import java.util.Date
           java.util.Calendar))

(repo/init-db)

(def ^:private a-day-ago
  (doto (Calendar/getInstance)
    (.add Calendar/DAY_OF_MONTH -1)))

(def ^:private outdated-date
  (.getTime (doto (.clone a-day-ago)
              (.add Calendar/MINUTE -1))))

(def ^:private not-outdated-date
  (.add (.clone a-day-ago) Calendar/MINUTE 1))

(def ^:private records
  [["aaa" "aaa-addr1" 0.0 1.0 :timestamp outdated-date]
   ["aaa" "aaa-addr2" 2.0 3.0]
   ["aaa" "aaa-addr2" 2.0 3.0]
   ["bbb" "bbb-addr1" 4.0 5.0]
   ["bbb" "bbb-addr2" 6.0 7.0 :timestamp not-outdated-date]
   ["bbb" "bbb-addr3" 8.0 9.0 :timestamp outdated-date]])

(doseq [data records]
  (apply repo/add-item data))

(t/deftest cache-repo-test
  (t/testing "items insertion"
    (let [db-records (repo/select-all)]
      (t/is (= (count db-records) 6))
      
      (t/is (= (map (partial take 4) records)
               (map (juxt :query_address :address :lat :lng)
                    db-records)))))

  (t/testing "repo lookup"
    (let [db-records (repo/get-items "aaa")]
      
      (t/is (= (count db-records) 1))

      (t/is (= [["aaa-addr2" 2.0 3.0]]
               (map (juxt :address :lat :lng) db-records)))))

  (t/testing "outdated records deletion"
    (do
      (repo/remove-outdated)
      (t/is (= (count (repo/select-all))
               4)))))

