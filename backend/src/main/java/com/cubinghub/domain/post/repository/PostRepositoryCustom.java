package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.entity.PostCategory;

public interface PostRepositoryCustom {

    PostSearchResult search(PostCategory category, String keyword, String author, int offset, int limit);
}
