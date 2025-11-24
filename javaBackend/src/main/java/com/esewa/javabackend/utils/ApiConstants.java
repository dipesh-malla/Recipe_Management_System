package com.esewa.javabackend.utils;


public final class ApiConstants {

    private ApiConstants() {
        throw new IllegalStateException("Utility class");
    }

    public static final String API_BASE = "/api/v1";

    // ------------------- AUTHENTICATION -------------------
    public static final class Auth {
        public static final String BASE = API_BASE + "/auth";
        public static final String SIGNUP = BASE + "/signup";
        public static final String LOGIN = BASE + "/login";
        public static final String ME = BASE + "/me";
        public static final String LOGOUT = BASE + "/logout";
        public static final String REFRESH = BASE + "/refresh-token";
    }

    // ------------------- USERS & PROFILES -------------------
    public static final class User {
        public static final String BASE = API_BASE + "/users";
        public static final String UPDATE = BASE + "/{userId}";
        public static final String PROFILE = BASE + "/{userId}";
        public static final String STATS = BASE + "/{userId}/stats";
        public static final String BOOKMARKS = BASE + "/{userId}/bookmarks";
    }

    // ------------------- SOCIAL GRAPH -------------------
    public static final class Social {
        public static final String FOLLOW = API_BASE + "/follows";
        public static final String FRIENDS_REQUEST = API_BASE + "/friends/request";
        public static final String FRIENDS_ACCEPT = API_BASE + "/friends/{id}/accept";
        public static final String FOLLOWERS = API_BASE + "/users/{userId}/followers";
        public static final String FOLLOWING = API_BASE + "/users/{userId}/following";
    }

    // ------------------- FEED & DISCOVERY -------------------
    public static final class Feed {
        public static final String FEED = API_BASE + "/feed";
        public static final String EXPLORE = API_BASE + "/explore";
    }

    // ------------------- POSTS & RECIPES -------------------
    public static final class Post {
        public static final String BASE = API_BASE + "/posts";
        public static final String DELETE = BASE + "/{id}";
        public static final String FILTER = BASE + "/filter";
        public static final String TOGGLE = BASE + "/toggle";
    }

    public static final class Recipe {
        public static final String BASE = API_BASE + "/recipes";
        public static final String DELETE = BASE + "/{id}";
        public static final String UPDATE = BASE + "/{id}";
        public static final String GET = BASE + "/{id}";
        public static final String SEARCH = BASE; // GET /recipes with query params
    }

    // ------------------- COMMENTS & REACTIONS -------------------
    public static final class Comment {
        public static final String BASE = API_BASE + "/comments";
    }

    public static final class Reaction {
        public static final String BASE = API_BASE + "/reactions";
        public static final String DELETE = BASE + "/{id}";
    }

    // ------------------- SHARES & BOOKMARKS -------------------
    public static final class Share {
        public static final String BASE = API_BASE + "/shares";
    }

    public static final class Bookmark {
        public static final String BASE = API_BASE + "/bookmarks";
    }

    // ------------------- GROUPS / COMMUNITIES -------------------
    public static final class Group {
        public static final String BASE = API_BASE + "/groups";
        public static final String JOIN = BASE + "/{id}/join";
        public static final String POSTS = BASE + "/{id}/posts";
    }

    // ------------------- MESSAGING -------------------
    public static final class Messaging {
        public static final String CONVERSATIONS = API_BASE + "/conversations";
        public static final String MESSAGES = CONVERSATIONS + "/{id}/messages";
    }

    // ------------------- NOTIFICATIONS -------------------
    public static final class Notification {
        public static final String BASE = API_BASE + "/notifications";
        public static final String MARK_READ = BASE + "/mark_read";
    }

    // ------------------- SEARCH & SEMANTIC DISCOVERY -------------------
    public static final class Search {
        public static final String BASE = API_BASE + "/search";
        public static final String SUGGESTIONS = BASE + "/suggestions";
    }

    // ------------------- RECOMMENDATIONS & ML -------------------
    public static final class Recommendation {
        public static final String BASE = API_BASE + "/recommendations";
        public static final String FEEDBACK = BASE + "/feedback";
        public static final String ML_ENCODE = BASE + "/ml/encode";
        public static final String IMAGE_RECOGNIZE = BASE + "/ml/image_recognize";
    }

    // ------------------- MODERATION / ADMIN -------------------
    public static final class Moderation {
        public static final String REPORTS = API_BASE + "/moderation/reports";
        public static final String RESOLVE_REPORT = REPORTS + "/{id}/resolve";
        public static final String CONTENT = API_BASE + "/moderation/content/{id}";
        public static final String BAN_USER = API_BASE + "/moderation/ban_user";
        public static final String TAKEDOWN = API_BASE + "/moderation/takedown";
    }

    // ------------------- GENERIC -------------------
    public static final class Generic {
        public static final String FILTER = "/filter";
        public static final String TOGGLE_DATA = "/toggle";
        public static final String SEARCH = "/search";
        public static final String LIST = "/list";
    }
}
