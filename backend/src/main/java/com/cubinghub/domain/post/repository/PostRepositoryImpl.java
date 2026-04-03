package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.cubinghub.domain.post.entity.QPost.post;
import static com.cubinghub.domain.user.entity.QUser.user;

@Repository
@RequiredArgsConstructor
public class PostRepositoryImpl implements PostRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<PostListItemResponse> search(String keyword, String author) {
        return queryFactory
                .select(Projections.constructor(
                        PostListItemResponse.class,
                        post.id,
                        post.category,
                        post.title,
                        user.nickname,
                        post.viewCount,
                        post.createdAt
                ))
                .from(post)
                .join(post.user, user)
                .where(
                        keywordContains(keyword),
                        authorContains(author)
                )
                .orderBy(post.createdAt.desc(), post.id.desc())
                .fetch();
    }

    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }

        return post.title.containsIgnoreCase(keyword)
                .or(post.content.containsIgnoreCase(keyword));
    }

    private BooleanExpression authorContains(String author) {
        if (!StringUtils.hasText(author)) {
            return null;
        }

        return user.nickname.containsIgnoreCase(author);
    }
}
