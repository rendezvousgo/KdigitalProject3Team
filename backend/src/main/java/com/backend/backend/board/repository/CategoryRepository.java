package com.backend.backend.board.repository;

import com.backend.backend.board.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findFirstByOrderByIdAsc();
}
