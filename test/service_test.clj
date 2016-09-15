(ns service-test
  (:require [clojure.test :as t]
            [conjure.core :as mock]
            [geoclient.service :as sut]
            [geoclient.cache-repo :as cache]
            [clj-http.client :as http]))

(def ^:private service-result
  (slurp "test/resources/server_response.json"))

(t/deftest service-test
  
  (t/testing "results present in cache -> results"
    (mock/stubbing
     [cache/get-items [{:address "aaa" :lat 1.0 :lng 2.0}
                       {:address "bbb" :lat 3.0 :lng 4.0}]]
     (mock/mocking
      [http/get]
      (t/is (= 2 (-> (sut/lookup-geo "some geo") :results count)))
      (mock/verify-call-times-for http/get 0))))

  (t/testing "error status for blank or nil address -> error status"
    (t/is (:error (sut/lookup-geo nil)))
    (t/is (:error (sut/lookup-geo "     "))))

  (t/testing "long server response -> timeout status, delayed items addition"
    (with-redefs [http/get (fn [& args]
                             (Thread/sleep 1050)
                             {:body service-result})]
      (mock/stubbing
       [cache/get-items nil]
       (t/is (= (:error (sut/lookup-geo "aaa"))
                :timeout))
       (mock/mocking
        [cache/add-item]
        (mock/verify-call-times-for cache/get-items 1)
        (Thread/sleep 100)
        (mock/verify-call-times-for cache/add-item 2)))))

  (t/testing "quick server error -> error status"
    (with-redefs [http/get (fn [& args] (throw (Exception. "some exception")))]
      (mock/stubbing
       [cache/get-items nil]
       (t/is (= :server-error (:error (sut/lookup-geo "aaa")))))))

  (t/testing "long server error -> timeout status, no items addition"
    (with-redefs [http/get (fn [& args]
                             (Thread/sleep 1050)
                             (throw (Exception. "some exception")))]
      (mock/stubbing
       [cache/get-items nil]
       (t/is (= (:error (sut/lookup-geo "aaa"))
                :timeout))
       (mock/mocking
        [cache/add-item]
        (mock/verify-call-times-for cache/get-items 1)
        (Thread/sleep 100)
        (mock/verify-call-times-for cache/add-item 0)))))
  
  (t/testing "quick result from the server -> items addition"
    (with-redefs [http/get (fn [& args] {:body service-result})]
      (mock/stubbing
       [cache/get-items nil]
       (mock/mocking
        [cache/add-item]
        (sut/lookup-geo "someLocation")
        (mock/verify-call-times-for cache/get-items 1)
        (Thread/sleep 100)
        (mock/verify-call-times-for cache/add-item 2))))))


