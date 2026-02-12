package com.backend.backend.board.repository;

import com.backend.backend.board.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByBoard_IdOrderByIdDesc(Long boardId);
    void deleteByBoard_Id(Long boardId);
}