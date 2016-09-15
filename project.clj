(defproject geoclient "0.1.0-SNAPSHOT"
  :description "FIXME: write description"
  :url "http://example.com/FIXME"
  :min-lein-version "2.0.0"
  :dependencies [[org.clojure/clojure "1.8.0"]
                 [compojure "1.5.1"]
                 [org.clojure/data.json "0.2.6"]
                 [clj-http "3.2.0"]
                 [org.clojure/core.async "0.2.385"]
                 [ring/ring-defaults "0.2.1"]
                 [org.hsqldb/hsqldb "2.3.4"]
                 [com.taoensso/timbre "4.7.4"]
                 [hiccup "1.0.5"]
                 [ring/ring-json "0.4.0"]
                 [org.clojure/java.jdbc "0.6.1"]
                 [environ "1.1.0"]]
  :plugins [[lein-ring "0.9.7"]
            [lein-environ "1.1.0"]]
  :env {:database-url "mem:geo_cache_db"}
  :ring {:handler geoclient.handler/app}
  :profiles
  {:dev {:dependencies [[javax.servlet/servlet-api "2.5"]]
         :env {:database-url "mem:geo_cache_db_dev"}}
   :test {:dependencies [[ring/ring-mock "0.3.0"]
                         [org.clojars.runa/conjure "2.1.3"]]
          :env {:database-url "mem:geo_cache_db_test"}}})
