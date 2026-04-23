package com.cubinghub.domain.adminmemo.repository;

import com.cubinghub.domain.adminmemo.entity.AdminMemo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminMemoRepository extends JpaRepository<AdminMemo, Long> {

    Page<AdminMemo> findAllBy(Pageable pageable);
}
