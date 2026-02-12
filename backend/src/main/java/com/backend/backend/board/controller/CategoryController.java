package com.backend.backend.board.controller;

import com.backend.backend.board.entity.Category;
import com.backend.backend.board.repository.BoardRepository;
import com.backend.backend.board.repository.CategoryRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(originPatterns = "*", allowCredentials = "true")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;
    @Autowired
    private BoardRepository boardRepository;

    @GetMapping
    public List<Category> list() {
        return categoryRepository.findAll();
    }

    @PostMapping
    public Category create(@RequestBody Category category, HttpSession session) {
        requireAdmin(session);
        if (category.getName() == null || category.getName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name required");
        }
        Category c = new Category();
        c.setName(category.getName().trim());
        return categoryRepository.save(c);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, HttpSession session) {
        requireAdmin(session);
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "category not found");
        }
        String name = category.getName();
        if (isProtectedCategory(name)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "default category");
        }
        var boards = boardRepository.findByCategory_Id(id);
        for (var board : boards) {
            board.setCategory(null);
        }
        boardRepository.saveAll(boards);
        categoryRepository.deleteById(id);
    }

    private void requireAdmin(HttpSession session) {
        String role = (String) session.getAttribute("ROLE");
        if (role == null || !role.equals("ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "admin only");
        }
    }

    private void requireLogin(HttpSession session) {
        String username = (String) session.getAttribute("LOGIN_USER");
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "login required");
        }
    }

    private boolean isProtectedCategory(String name) {
        if (name == null) return false;
        String trimmed = name.trim();
        if (trimmed.equals("오류 제보") || trimmed.equals("오류제보")) return true;
        if (trimmed.equalsIgnoreCase("Q&A") || trimmed.equalsIgnoreCase("QnA") || trimmed.equalsIgnoreCase("QNA")) return true;
        return trimmed.equals("건의");
    }
}
