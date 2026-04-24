package com.cubinghub.domain.post.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

import com.cubinghub.domain.post.dto.response.PostListItemResponse;
import com.cubinghub.domain.post.entity.PostCategory;
import com.querydsl.core.types.EntityPath;
import com.querydsl.core.types.FactoryExpression;
import com.querydsl.core.types.Predicate;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static com.cubinghub.domain.post.entity.QPost.post;
import static com.cubinghub.domain.user.entity.QUser.user;

@ExtendWith(MockitoExtension.class)
@DisplayName("PostRepositoryImpl 단위 테스트")
class PostRepositoryImplTest {

    @Mock
    private JPAQueryFactory queryFactory;

    @Mock
    private JPAQuery<PostListItemResponse> listQuery;

    @Mock
    private JPAQuery<Long> countQuery;

    private PostRepositoryImpl postRepository;

    @BeforeEach
    void setUp() {
        postRepository = new PostRepositoryImpl(queryFactory);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    @DisplayName("count query가 null을 반환하면 총 개수는 0으로 보정한다")
    void should_return_zero_total_elements_when_count_query_returns_null() {
        PostListItemResponse item = new PostListItemResponse(1L, PostCategory.FREE, "제목", "작성자", 3, null);
        when(queryFactory.select(any(FactoryExpression.class))).thenReturn((JPAQuery) listQuery);
        when(queryFactory.select(any(NumberExpression.class))).thenReturn((JPAQuery) countQuery);
        when(listQuery.from(any(EntityPath.class))).thenReturn(listQuery);
        when(listQuery.join(post.user, user)).thenReturn(listQuery);
        when(listQuery.orderBy(any(), any())).thenReturn(listQuery);
        doReturn(listQuery).when(listQuery).where(nullable(Predicate.class), nullable(Predicate.class), nullable(Predicate.class));
        when(listQuery.offset(anyLong())).thenReturn(listQuery);
        when(listQuery.limit(anyLong())).thenReturn(listQuery);
        when(listQuery.fetch()).thenReturn(List.of(item));
        when(countQuery.from(any(EntityPath.class))).thenReturn(countQuery);
        doReturn(countQuery).when(countQuery).where(nullable(Predicate.class), nullable(Predicate.class));
        when(countQuery.fetchOne()).thenReturn(null);

        PostSearchResult result = postRepository.search(null, null, null, 0, 10);

        assertThat(result.getItems()).containsExactly(item);
        assertThat(result.getTotalElements()).isZero();
    }
}
