package com.cubinghub.domain.post.repository;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.entity.PostCategory;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
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
        BooleanExpression categoryPredicate = categoryEq(category);
        BooleanExpression keywordPredicate = keywordContains(keyword);
        BooleanExpression authorPredicate = authorContains(author);

        List<PostListItemResponse> items = basePostListQuery()
                .where(
                        categoryPredicate,
                        keywordPredicate,
                        authorPredicate
                )
                .offset(offset)
                .limit(limit)
                .fetch();

        Long totalElements = countPosts(categoryPredicate, keywordPredicate, authorPredicate);

        return new PostSearchResult(items, totalElements != null ? totalElements : 0L);
    }

    @Override
    public List<PostListItemResponse> findRecent(int limit) {
        return basePostListQuery()
                .limit(limit)
                .fetch();
    }

    private com.querydsl.jpa.impl.JPAQuery<PostListItemResponse> basePostListQuery() {
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
                .orderBy(post.createdAt.desc(), post.id.desc());
    }

    private Long countPosts(BooleanExpression categoryPredicate,
                            BooleanExpression keywordPredicate,
                            BooleanExpression authorPredicate) {
        JPAQuery<Long> countQuery = queryFactory
                .select(post.count())
                .from(post)
                .where(categoryPredicate, keywordPredicate);

        if (authorPredicate != null) {
            countQuery.join(post.user, user)
                    .where(authorPredicate);
        }

        return countQuery.fetchOne();
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
