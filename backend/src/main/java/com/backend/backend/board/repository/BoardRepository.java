package com.backend.backend.board.repository;

import com.backend.backend.board.entity.Board;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long> {
    Page<Board> findByCategory_Id(Long categoryId, Pageable pageable);
    List<Board> findByCategory_Id(Long categoryId);
    Page<Board> findByTitleContaining(String title, Pageable pageable);
}