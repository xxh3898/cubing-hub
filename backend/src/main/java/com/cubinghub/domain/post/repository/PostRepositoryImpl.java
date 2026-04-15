package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.entity.PostCategory;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import static com.cubinghub.domain.post.entity.QPost.post;
import static com.cubinghub.domain.user.entity.QUser.user;

@Repository
@RequiredArgsConstructor
public class PostRepositoryImpl implements PostRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public PostSearchResult search(PostCategory category, String keyword, String author, int offset, int limit) {
        List<PostListItemResponse> items = queryFactory
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
                        categoryEq(category),
                        keywordContains(keyword),
                        authorContains(author)
                )
                .orderBy(post.createdAt.desc(), post.id.desc())
                .offset(offset)
                .limit(limit)
                .fetch();

        Long totalElements = queryFactory
                .select(post.count())
                .from(post)
                .join(post.user, user)
                .where(
                        categoryEq(category),
                        keywordContains(keyword),
                        authorContains(author)
                )
                .fetchOne();

        return new PostSearchResult(items, totalElements != null ? totalElements : 0L);
    }

    private BooleanExpression categoryEq(PostCategory category) {
        if (category == null) {
            return null;
        }

        return post.category.eq(category);
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
