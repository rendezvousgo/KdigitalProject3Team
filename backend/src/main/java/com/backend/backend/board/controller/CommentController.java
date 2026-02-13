package com.backend.backend.board.controller;

import com.backend.backend.board.entity.Comment;
import com.backend.backend.board.repository.BoardRepository;
import com.backend.backend.board.repository.CommentRepository;
import com.backend.backend.user.AuthController;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
@RequestMapping("/api/board")
public class CommentController {

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private BoardRepository boardRepository;

    @GetMapping("/{boardId}/comments")
    public List<Comment> getComments(@PathVariable Long boardId) {
        return commentRepository.findByBoard_IdOrderByIdDesc(boardId);
    }

    @PostMapping("/{boardId}/comments")
    public Comment addComment(@PathVariable Long boardId, @RequestBody Comment comment, HttpSession session) {
        String username = requireLogin(session);
        var board = boardRepository.findById(boardId).orElse(null);
        if (board == null) return null;

        comment.setWriter(username);
        comment.setBoard(board);
        return commentRepository.save(comment);
    }

    @DeleteMapping("/{boardId}/comments/{commentId}")
    public String deleteComment(@PathVariable Long boardId, @PathVariable Long commentId, HttpSession session) {
        String username = requireLogin(session);
        boolean isAdmin = isAdmin(session);

        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null) return "FAIL: Comment " + commentId + " not found";

        if (!isAdmin && (comment.getWriter() == null || !comment.getWriter().equals(username))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "not owner");
        }

        commentRepository.deleteById(commentId);
        return "SUCCESS: Deleted Comment " + commentId;
    }

    private String requireLogin(HttpSession session) {
        String username = (String) session.getAttribute(AuthController.SESSION_USER);
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "login required");
        }
        return username;
    }

    private boolean isAdmin(HttpSession session) {
        String role = (String) session.getAttribute("ROLE");
        return "ADMIN".equals(role);
    }
}