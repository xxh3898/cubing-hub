package com.cubinghub.common.validation;

public final class InputConstraints {

    public static final int EMAIL_MAX_LENGTH = 255;
    public static final int NICKNAME_MAX_LENGTH = 50;
    public static final int RANKING_NICKNAME_SEARCH_MAX_LENGTH = 50;
    public static final int POST_SEARCH_KEYWORD_MAX_LENGTH = 100;
    public static final int POST_SEARCH_AUTHOR_MAX_LENGTH = 50;
    public static final int POST_TITLE_MAX_LENGTH = 100;
    public static final int POST_CONTENT_MAX_LENGTH = 2000;
    public static final int FEEDBACK_TITLE_MAX_LENGTH = 100;
    public static final int FEEDBACK_CONTENT_MAX_LENGTH = 2000;
    public static final int PASSWORD_MAX_LENGTH = 64;
    public static final int PASSWORD_MAX_BYTES = 72;

    private InputConstraints() {
    }
}
