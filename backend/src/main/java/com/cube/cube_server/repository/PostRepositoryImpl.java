package com.cube.cube_server.repository;

import com.cube.cube_server.domain.Post;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class PostRepositoryImpl implements PostRepository {

    private final EntityManager em;

    @Override
    public void save(Post post) {
        if (post.getId() == null) {
            em.persist(post);
        } else {
            em.merge(post);
        }
    }

    @Override
    public Post findOne(Long id) {
        return em.find(Post.class, id);
    }

    @Override
    public List<Post> findAll() {
        return em.createQuery("select p from Post p", Post.class)
                .getResultList();
    }

    @Override
    public List<Post> findAllDesc() {
        return em.createQuery(
                        "select p from Post p join fetch p.member m order by p.createTime desc", Post.class)
                .getResultList();
    }

    @Override
    public List<Post> findByMemberId(String memberId) {
        return em.createQuery(
                        "select p from Post p join fetch p.member m where m.id = :memberId order by p.createTime desc", Post.class)
                .setParameter("memberId", memberId)
                .getResultList();
    }

    @Override
    public void remove(Post post) {
        em.remove(post);
    }
}