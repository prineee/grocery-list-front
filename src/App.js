import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import { Container } from "shards-react";
import { isIP } from "validator";
import Home from "./components/Home";
import Login from "./components/Login";
import CreateAccount from "./components/CreateAccount";
import Profile from "./components/Profile";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Settings from "./components/Settings";
import PassReset from "./components/PassReset";
import Privacy from "./components/Privacy";
import ModalCover from "./components/ModalCover";
import { ToastContainer } from 'react-toastify';
import "shards-ui/dist/css/shards.min.css";
import API from "./utilities/api";
import moment from "moment";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { css } from 'glamor';
import './App.scss';

function App() {
  const create = { name: "Join", link: "/join" };
  const signIn = { name: "Login", link: "/login" };
  const signOut = { name: "Logout", link: "/signout" };
  const profile = { name: "Profile", link: "/profile" };
  const settings = { name: "Settings", link: "/settings" };
  const [navOptions, setNavOptions] = useState([create, signIn]);
  const [user, setUser] = useState([]);
  const [isValid, setIsValid] = useState(false);
  const [IP, setIP] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");
  const [currList, setCurrList] = useState([]);
  const [connections, setConnections] = useState([]);
  const [settingsTab, setSettingsTab] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [homeNewUserEmail, setHomeNewUserEmail] = useState("");
  const [cover, setCover] = useState(false);

  useEffect(() => {
    toggleDarkMode();
  }, []);
  function toggleDarkMode() {
    const black = "#2F3338";
    const white = "#F9FCFF";
    const mainBlue = "#3C91E6";
    const mainBlueDark = "rgb(4, 104, 205)";
    // check for dark mode setting in local storage
    const darkMode = localStorage.getItem("dark-mode");
    if (darkMode) {
      document.documentElement.style.setProperty('--primary-color', white);
      document.documentElement.style.setProperty('--secondary-color', black);
      document.documentElement.style.setProperty('--main-blue', mainBlueDark);
      setIsDark(true);
    } else {
      document.documentElement.style.setProperty('--primary-color', black);
      document.documentElement.style.setProperty('--secondary-color', white);
      document.documentElement.style.setProperty('--main-blue', mainBlue);
      setIsDark(false);
    }
  }
  useEffect(() => {
    const storedIP = localStorage.getItem("IP") || " ";
    if (isIP(storedIP)) {
      setIP(storedIP);
    } else {
      getIP()
        .then()
        .catch();
    }
  }, []);
  function userLogin(email, password, remember, config) {
    return new Promise((resolve, reject) => {
      getIP()
        .then(response => {
          const userData = {
            email,
            password,
            ip: response,
            time: moment().toDate()
          }
          // reset error message
          setError("");
          API.userLogin(userData, config)
            .then(res => {
              if (res.data[0].dark_mode) {
                localStorage.setItem("dark-mode", "yes");
                toggleDarkMode();
              }
              setUser(res.data);
              setIsValid(true);
              // change side menu options
              setNavOptions([profile, settings, signOut]);
              // get notifications for user
              getAllUserNotifications(res.data[0].id);
              // get all connections for user
              getConnectionsByID(res.data[0].id);
              // if the user has clicked the remember me button
              if (remember) {
                localStorage.setItem("token", res.data[0].user_auth);
              } else {
                sessionStorage.setItem("token", res.data[0].user_auth)
              }
              resolve(true);
            })
            .catch(err => {
              console.log(err);
              setError(err.response.data);
              reject(err);
            });
        });
    })
      .catch();
  }
  function validateUser() {
    let token = localStorage.getItem("token");
    let remember = false;
    if (token && token.length > 60) {
      remember = true;
    } else if (sessionStorage.getItem("token")) {
      token = sessionStorage.getItem("token");
    } else {
      return false;
    }
    // make sure the IP has been found before attempting to validate
    getIP()
      .then(res => {
        getStatus(token, res, remember)
          .then(response => {
            if (response) {
              return true;
            } else {
              return false;
            }
          })
      })
      .catch(() => { return false });
  }
  function getIP() {
    return new Promise(function (resolve, reject) {
      // check if an IP is already stored
      let storedIP = localStorage.getItem("IP") || " ";
      // if it is a valid IP address, return the value and avoid the API call
      if (isIP(storedIP)) {
        resolve(storedIP);
      } else if (isIP(IP)) {
        resolve(IP);
      } else {
        // get user IP address to compare with DB
        API.getIP()
          .then(res => {
            setIP(res.data);
            localStorage.setItem("IP", res.data);
            resolve(res.data);
          })
          .catch(err => {
            console.log(err.response.data);
            reject();
          });
      }
    })
  }
  function getStatus(token, ip, remember) {
    return new Promise(function (resolve, reject) {
      // move this function from external file to this file
      API.validateUser(token || user[0].user_auth, ip)
        .then(res => {
          setUser(res.data);
          setIsValid(true);
          // change side menu options
          setNavOptions([profile, settings, signOut]);
          // get notifications for user
          getAllUserNotifications(res.data[0].id);
          // get all connections for user
          getConnectionsByID(res.data[0].id);
          // if user has said to remember them, no need to check the time difference
          if (remember) {
            resolve(true);
          } else {
            // check time difference returned from db
            // should look like "-00:54:41"
            // grab second element from spliting the string and convert to a number
            const timeDifference = parseInt(res.data.time_difference.split(":")[1]);
            // check if it has been more than 30 minutes
            if (timeDifference <= 30) {
              resolve(true);
            } else {
              reject(false);
            }
          }
        })
        // if there is an error from the db, the user token does not match
        .catch(err => {
          console.log(err);
          // remove what is store in local storate
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          // reset navbar
          setNavOptions([create, signIn]);
          // reset connections
          setConnections([]);
          // reset notifications
          setNotifications([]);
          reject(false);
        });
    });
  }
  function getAllUserNotifications(id) {
    API.getNotificationsByUser(id)
      .then(res => {
        setNotifications(res.data);
      })
      .catch(err => {
        console.log(err);
      });
  }
  function markNotificationAsRead(id) {
    API.updateNotificationByID(id)
      .then(() => getAllUserNotifications(user[0].id))
      .catch(err => console.log(err));
  }
  function deleteNotification(id) {
    API.deleteNotificationByID(id)
      .then(() => getAllUserNotifications(user[0].id))
      .catch(err => console.log(err));
  }
  function getListByID(listID, userID) {
    let id = userID || user[0].id;
    return new Promise(function (resolve, reject) {
      API.getListByID(listID, id)
        .then(res => {
          resolve(res.data);
        })
        .catch(err => reject(err));
    });
  }
  function getConnectionsByID(id) {
    API.getConnectionsByID(id || user[0].id)
      .then(res => {
        setConnections(res.data);
      })
      .catch(err => setError(err));
  }
  function updateUser(data) {
    return new Promise(function (resolve, reject) {
      API.updateUser(user[0].id, data)
        .then(res => {
          if (res.data === "success") {
            validateUser();
            resolve();
          }
        })
        .catch(err => {
          console.log(err);
          setError(err.response.data);
          reject(err.response.data);
        });
    })
  }
  function removeConnection(id) {
    return new Promise(function (resolve, reject) {
      API.removeConnection(id)
        .then(res => {
          resolve(res.data);
          getConnectionsByID();
        })
        .catch(err => {
          reject(err.response.data);
        });
    })
  }
  function cancelConnectionRequest(id) {
    return new Promise(function (resolve, reject) {
      API.cancelConnectionRequest(id)
        .then(res => {
          resolve(res.data);
          getConnectionsByID();
        })
        .catch(err => {
          reject(err.response.data);
        })
    })
  }
  function updateConnection(connection) {
    // console.log(connection, connection.id);
    return new Promise((resolve, reject) => {
      API.updateConnection(connection.id, connection)
        .then(res => {
          if (res.data === "success") {
            getConnectionsByID();
            resolve(true);
          } else {
            reject(res.data);
          }
        })
        .catch(err => {
          console.log(err);
          reject(err);
        });
    });
  }
  function logout() {
    return new Promise(function (resolve, reject) {
      API.logout()
        .then(() => {
          localStorage.clear();
          sessionStorage.clear();
          setNavOptions([create, signIn]);
          setUser([]);
          resolve();
        })
        .catch(err => reject(err));
    });
  }
  function createConnection(connectEmail, config) {
    return new Promise(function (resolve, reject) {
      const data = {
        email: connectEmail,
        username: `${user[0].first_name} ${user[0].last_name.charAt(0)}`,
        id: user[0].id
      }
      API.createConnection(data, config)
        .then(res => {
          getConnectionsByID();
          resolve(res.data);
        })
        .catch(err => {
          console.log(err);
          console.log(err.response.data);
          reject(err);
        });
    });
  }
  function changeSettingsTab(tab) {
    setSettingsTab(tab);
  }
  function notification(message) {
    if (isDark) {
      toast(message, {
        className: css({
          background: 'rgb(4, 104, 205)',
          boxShadow: '0px 13px 12px -12px rgba(47,51,56,0.64)',
          borderRadius: '8px',
          border: "3px solid #2F3338",
          textTransform: "capitalize"
        }),
        bodyClassName: css({
          fontSize: '20px',
          color: '#F9FCFF'
        }),
        progressClassName: css({
          background: "linear-gradient(90deg, rgb(4, 104, 205) 0%, #2F3338 80%)"
        })
      });
    } else {
      toast(message, {
        className: css({
          background: '#3C91E6',
          boxShadow: '0px 13px 12px -12px rgba(47,51,56,0.64)',
          borderRadius: '8px',
          border: "3px solid #F9FCFF",
          textTransform: "capitalize"
        }),
        bodyClassName: css({
          fontSize: '20px',
          color: '#F9FCFF'
        }),
        progressClassName: css({
          background: "linear-gradient(90deg, rgb(86,149,211) 0%, rgb(249,252,255) 80%)"
        })
      });
    }
  }
  return (
    <Router>
      <Container fluid={true}>
        <Navbar
          options={navOptions}
          isLogged={user.length}
          notifications={notifications}
          markNotificationAsRead={markNotificationAsRead}
          deleteNotification={deleteNotification}
          currList={currList}
          user={user}
          getListByID={getListByID}
          logout={logout}
          changeSettingsTab={changeSettingsTab}
          updateUser={updateUser}
          notification={notification}
        />
        {cover ? (
          <ModalCover />
        ) : (<div />)}
        <Switch>
          <Route exact path="/" render={props => (
            (validateUser() ? (
              <Home
                {...props}
                user={user}
                setHomeNewUserEmail={setHomeNewUserEmail}
              />
            ) : (
                <Home
                  {...props}
                  user={user}
                  setHomeNewUserEmail={setHomeNewUserEmail}
                />
              ))
          )} />
          <Route exact path="/privacy" render={props => (
            (validateUser() ? (
              <Privacy
                {...props}
                user={user}
              />
            ) : (
                <Privacy
                  {...props}
                />
              ))
          )} />
          <Route
            exact path="/login"
            render={props => (
              (validateUser() ? (
                <Redirect to="/profile" />
              ) : (
                  <Login
                    {...props}
                    userLogin={userLogin}
                    error={error}
                    user={user}
                    setCover={setCover}
                  />
                ))
            )}
          />
          <Route
            exact path="/join"
            render={props => (
              (validateUser() ? (
                <Redirect to="/profile" />
              ) : (
                  <CreateAccount
                    {...props}
                    user={user}
                    userLogin={userLogin}
                    notification={notification}
                    homeNewUserEmail={homeNewUserEmail}
                    setCover={setCover}
                  />
                ))
            )}
          />
          <Route
            exact path="/reset"
            component={PassReset}
            render={props => (
              <PassReset
                {...props}
                notification={notification}
              />
            )}
          />
          <Route
            exact path="/profile"
            render={props => (
              (isValid && user.length === 1) || validateUser() ? (
                <Profile
                  {...props}
                  user={user}
                  setCurrList={setCurrList}
                  getListByID={getListByID}
                  notification={notification}
                  updateUser={updateUser}
                />
              ) : (
                  <Redirect to="/login" />
                )
            )}
          />
          <Route
            exact path="/settings"
            render={props => (
              (isValid && user.length === 1) || validateUser() ? (
                <Settings
                  {...props}
                  user={user}
                  connections={connections}
                  updateUser={updateUser}
                  currList={currList}
                  removeConnection={removeConnection}
                  cancelConnectionRequest={cancelConnectionRequest}
                  createConnection={createConnection}
                  updateConnection={updateConnection}
                  tab={settingsTab}
                  toggleDarkMode={toggleDarkMode}
                  isDark={isDark}
                  notification={notification}
                  logout={logout}
                />
              ) : (
                  <Redirect to="/login" />
                )
            )}
          />
          <Route path="*">
            <Redirect to="/" />
          </Route>
        </Switch>
        {window.screen.width > 500 ? (
          <ToastContainer
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnVisibilityChange
            draggable
            pauseOnHover
          />
        ) : (
            <ToastContainer
              position="top-center"
              autoClose={2500}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnVisibilityChange
              draggable
              pauseOnHover
            />
          )}
        <Footer
          navOptions={navOptions}
          notifications={notifications}
          changeSettingsTab={changeSettingsTab}
          getListByID={getListByID}
          notification={notification}
          updateUser={updateUser}
          markNotificationAsRead={markNotificationAsRead}
        />
      </Container>
    </Router>
  );
}

export default App;
